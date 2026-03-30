SCRIPT_ANALYSIS_PROMPT = """You are a professional film production analyst. Analyze the following screenplay and extract structured production data.

Return a JSON object with exactly this structure:
{
  "title": "The title of the screenplay",
  "characters": [
    {
      "id": "char_01",
      "name": "Character Name",
      "age": 30,
      "role": "Brief role description (e.g., 'The Protagonist', 'The Mentor')",
      "appearance": "Detailed physical appearance description including build, facial features, hair, distinguishing marks",
      "personality": "Key personality traits and behavioral patterns",
      "scenes": ["scene_01", "scene_03"]
    }
  ],
  "props": [
    {
      "id": "prop_01",
      "name": "Prop Name",
      "category": "HERO PROP | FUNCTIONAL | SET DRESSING | KEY PROP | COSTUME ALT",
      "description": "Detailed visual description of the prop",
      "scenes": ["scene_01"]
    }
  ],
  "costumes": [
    {
      "id": "costume_01",
      "name": "Costume Name",
      "characterId": "char_01",
      "description": "Detailed description of the costume including fabric, style, condition",
      "materials": ["MATERIAL_TAG_1", "MATERIAL_TAG_2"],
      "scenes": ["scene_01", "scene_02"]
    }
  ],
  "scenes": [
    {
      "id": "scene_01",
      "number": 1,
      "title": "Brief evocative scene title",
      "location": "Specific location description",
      "mood": "Emotional tone and atmosphere",
      "timeOfDay": "Morning | Afternoon | Evening | Night | Dawn | Dusk",
      "characters": ["char_01"],
      "props": ["prop_01"],
      "costumes": ["costume_01"],
      "actions": "Detailed description of what happens visually in the scene, including camera movements and blocking",
      "dialogue": ["KEY_LINE: Brief key dialogue lines"],
      "cameraNote": "WIDE ANGLE | CLOSE UP | MACRO SHOT | TRACKING SHOT | AERIAL DRONE | STATIC INTERIOR | DOLLY | HANDHELD",
      "lightingStyle": "Concrete lighting description for AI video generation (e.g., 'warm golden hour sidelight with long shadows on dusty ground', 'harsh overhead fluorescents with green cast on pale skin', 'soft diffused overcast daylight filtering through curtains'). Must describe direction, quality, color temperature, and how light interacts with the environment.",
      "visualStyle": "Cinematic visual style and color palette (e.g., 'gritty desaturated tones with teal shadows and crushed blacks', 'vibrant saturated warmth with subtle lens flare', 'high contrast noir with deep blacks and sharp highlights'). Should complement the scene's mood and genre.",
      "estimatedDuration": 15
    }
  ]
}

Rules:
1. IDs must follow the pattern: char_XX, prop_XX, costume_XX, scene_XX (zero-padded two digits)
2. Every character, prop, and costume must be mapped to specific scenes
3. Scene character/prop/costume arrays must reference valid IDs from the respective lists
4. Appearance descriptions must be detailed enough for AI image generation (include skin tone, hair color/style, eye color, body type, age indicators)
5. Costume descriptions must include colors, fabric types, and styling details
6. Prop descriptions must include size, material, color, and distinctive features
7. Scene actions should describe visual composition suitable for video generation
8. Extract ALL characters, even minor ones, with importance noted in the role field
9. If the script doesn't explicitly state appearance details, infer reasonable defaults from context
10. Camera notes should suggest the most cinematically appropriate shot type for each scene
11. lightingStyle must be a concrete, visual description — avoid abstract words like "moody" or "dramatic". Describe what the light actually looks like: direction, color, intensity, shadows, reflections
12. visualStyle must describe the color palette, contrast, and film stock look — avoid vague terms. Be specific about colors and tonal qualities
13. estimatedDuration is the estimated video length in seconds (integer, min 8, max 148). Estimate based on:
    - Dialogue length: ~2 seconds per short line, ~4 seconds per long line, plus pauses
    - Action complexity: simple actions 8-15s, moderate 15-30s, complex sequences 30-60s+
    - Establishing/atmosphere shots: 8-15s
    - If a scene has both dialogue AND action, sum their durations
    - Round up to the nearest whole number

SCREENPLAY:
{script_text}

Return ONLY the JSON object, no additional text or markdown formatting."""
