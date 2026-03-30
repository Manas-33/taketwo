import json
import time
import logging
from google import genai
from app.config import GOOGLE_API_KEY
from app.prompts.script_analysis import SCRIPT_ANALYSIS_PROMPT

logger = logging.getLogger("filmai.gemini")


def get_client():
    return genai.Client(api_key=GOOGLE_API_KEY)


def _wait_for_file_active(client, file_ref, timeout: int = 120):
    """Poll until an uploaded file reaches ACTIVE state."""
    start = time.time()
    while time.time() - start < timeout:
        f = client.files.get(name=file_ref.name)
        if f.state.name == "ACTIVE":
            return f
        if f.state.name == "FAILED":
            raise RuntimeError(f"File processing failed: {file_ref.name}")
        time.sleep(2)
    raise TimeoutError(f"File {file_ref.name} did not become active within {timeout}s")


async def analyze_script(script_text: str) -> dict:
    client = get_client()
    prompt = SCRIPT_ANALYSIS_PROMPT.replace("{script_text}", script_text)

    logger.info("Sending script to Gemini for analysis (prompt length: %d chars)", len(prompt))
    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=prompt,
        config=genai.types.GenerateContentConfig(
            temperature=0.3,
            response_mime_type="application/json",
        ),
    )

    logger.info("Gemini response received (%d chars)", len(response.text))
    result = json.loads(response.text)
    logger.info(
        "Parsed result: %d characters, %d props, %d costumes, %d scenes",
        len(result.get("characters", [])),
        len(result.get("props", [])),
        len(result.get("costumes", [])),
        len(result.get("scenes", [])),
    )
    return result


async def interpret_edit_instruction(instruction: str, scene_data: dict) -> dict:
    client = get_client()
    prompt = f"""You are a film editor AI. Given a scene and an edit instruction, determine what changes to make.

Current scene data:
{json.dumps(scene_data, indent=2)}

Director's instruction: "{instruction}"

Return a JSON object with the changes to apply:
{{
  "regenerate": true/false (whether the scene video needs full regeneration),
  "prompt_modification": "modified scene description if regeneration needed",
  "transforms": {{
    "brightness": null or 0-200,
    "aiBlend": null or 0-100,
    "blurDepth": null or 0-100,
    "colorGrade": null or "golden"|"moody"|"vintage"|"cool",
    "backgroundShift": null or "description of new background"
  }}
}}

Return ONLY the JSON object."""

    logger.info("Interpreting edit instruction: '%s'", instruction[:100])
    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=prompt,
        config=genai.types.GenerateContentConfig(
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )
    result = json.loads(response.text)
    logger.info("Edit interpretation: regenerate=%s", result.get("regenerate"))
    return result


async def analyze_continuity(
    scene: dict,
    scene_video_path: str,
    prev_scene: dict | None = None,
    prev_video_path: str | None = None,
    characters: list | None = None,
    props: list | None = None,
    costumes: list | None = None,
) -> dict:
    client = get_client()

    logger.info("Uploading scene video for continuity: %s", scene_video_path)
    scene_file = client.files.upload(file=scene_video_path)
    scene_file = _wait_for_file_active(client, scene_file)

    video_parts = [scene_file]
    has_prev = False

    if prev_video_path:
        logger.info("Uploading previous scene video: %s", prev_video_path)
        prev_file = client.files.upload(file=prev_video_path)
        prev_file = _wait_for_file_active(client, prev_file)
        video_parts.append(prev_file)
        has_prev = True

    char_names = [c.get("name", c.get("id")) for c in (characters or []) if c.get("id") in scene.get("characters", [])]
    prop_names = [p.get("name", p.get("id")) for p in (props or []) if p.get("id") in scene.get("props", [])]
    costume_names = [c.get("name", c.get("id")) for c in (costumes or []) if c.get("id") in scene.get("costumes", [])]

    comparison_section = ""
    if has_prev and prev_scene:
        comparison_section = f"""
The FIRST video is the CURRENT scene (Scene {scene.get('number')}). The SECOND video is the PREVIOUS scene (Scene {prev_scene.get('number')}).
Compare them carefully for continuity errors at the transition.
Previous scene details:
- Title: {prev_scene.get('title')}
- Location: {prev_scene.get('location')}
- Actions: {prev_scene.get('actions')}
"""
    else:
        comparison_section = "Analyze this single scene for internal continuity issues (jump cuts, disappearing objects, position inconsistencies within the scene)."

    prompt = f"""You are a professional script supervisor and continuity expert analyzing film footage.

Current Scene (Scene {scene.get('number')}):
- Title: {scene.get('title')}
- Location: {scene.get('location')}
- Mood: {scene.get('mood')}
- Time of Day: {scene.get('timeOfDay')}
- Characters present: {', '.join(char_names) if char_names else 'Unknown'}
- Props expected: {', '.join(prop_names) if prop_names else 'None specified'}
- Costumes expected: {', '.join(costume_names) if costume_names else 'None specified'}
- Actions: {scene.get('actions')}
- Camera Note: {scene.get('cameraNote', 'N/A')}

{comparison_section}

Carefully inspect the footage for these categories of continuity issues:
1. **Prop mismatches** — objects appearing, disappearing, or changing position/state between shots or scenes
2. **Lighting discrepancies** — changes in light direction, intensity, color temperature, or shadow direction
3. **Actor position shifts** — characters in different positions, poses, or orientations than continuity demands
4. **Costume inconsistencies** — clothing changes, missing accessories, changed accessories between cuts
5. **Environment changes** — background elements that moved, changed, or appeared/disappeared

Be thorough but realistic. Only report genuine issues you can see in the video.

For each issue, provide a bounding box indicating WHERE in the frame the issue is visible at the given timestamp.
Use normalized coordinates from 0.0 to 1.0 relative to the video frame dimensions (0,0 is top-left, 1,1 is bottom-right).
If the issue is scene-wide (e.g. overall lighting change) and cannot be localized, set boundingBox to null.

Return a JSON object:
{{
  "issues": [
    {{
      "type": "prop" | "lighting" | "actor" | "costume" | "environment",
      "severity": "warning" | "critical",
      "title": "Short descriptive title (e.g. 'Prop mismatch: Cup moved')",
      "description": "Detailed description of the issue",
      "timestamp": "MM:SS approximate timestamp in the current scene video",
      "autoFixAvailable": false,
      "boundingBox": {{ "x": 0.0-1.0, "y": 0.0-1.0, "width": 0.0-1.0, "height": 0.0-1.0 }} or null
    }}
  ],
  "score": 0-100,
  "summary": "Brief one-sentence overall assessment"
}}

If no issues are found, return an empty issues array and score of 100."""

    logger.info("Sending continuity analysis request for scene %s (with_prev=%s)", scene.get("id"), has_prev)
    response = client.models.generate_content(
        model="gemini-flash-latest",
        contents=[*video_parts, prompt],
        config=genai.types.GenerateContentConfig(
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )

    result = json.loads(response.text)
    logger.info(
        "Continuity result for scene %s: score=%s, issues=%d",
        scene.get("id"), result.get("score"), len(result.get("issues", [])),
    )

    try:
        for f in video_parts:
            client.files.delete(name=f.name)
    except Exception:
        pass

    return result
