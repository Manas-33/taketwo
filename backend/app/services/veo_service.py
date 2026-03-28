import asyncio
import os
import logging
from math import ceil
from google import genai
from app.config import GOOGLE_API_KEY
from app.services.storage_service import upload_file, resolve_image_path, DATA_DIR

logger = logging.getLogger("filmai.veo")

MAX_REFERENCE_IMAGES = 3
INITIAL_CLIP_SECONDS = 8
EXTENSION_SECONDS = 7
MAX_EXTENSIONS = 1
EXTENSION_PROCESSING_DELAY = 15
EXTENSION_RETRY_ATTEMPTS = 4
EXTENSION_RETRY_BACKOFF = 15


def get_client():
    return genai.Client(api_key=GOOGLE_API_KEY)


def _log_api_error_details(exc: Exception):
    """Extract and log as much detail as possible from a Veo API error."""
    for attr in ("response", "body", "message", "status_code", "code"):
        val = getattr(exc, attr, None)
        if val is not None:
            logger.error("  -> %s: %s", attr, val)
    if hasattr(exc, "__cause__") and exc.__cause__:
        logger.error("  -> cause: %s", exc.__cause__)


def _load_reference_images(
    scene: dict, characters: list, props: list, costumes: list,
) -> list:
    """Load up to MAX_REFERENCE_IMAGES asset images for a scene."""
    image_paths: list[tuple[str, str]] = []

    for cid in scene.get("characters", []):
        char = next((c for c in characters if c["id"] == cid), None)
        if char:
            path = resolve_image_path(char.get("imageUrl"))
            if path:
                image_paths.append((path, char["name"]))

    for costid in scene.get("costumes", []):
        cost = next((c for c in costumes if c["id"] == costid), None)
        if cost:
            path = resolve_image_path(cost.get("imageUrl"))
            if path:
                image_paths.append((path, cost["name"]))

    for pid in scene.get("props", []):
        prop = next((p for p in props if p["id"] == pid), None)
        if prop:
            path = resolve_image_path(prop.get("imageUrl"))
            if path:
                image_paths.append((path, prop["name"]))

    image_paths = image_paths[:MAX_REFERENCE_IMAGES]

    ref_images = []
    for path, name in image_paths:
        with open(path, "rb") as f:
            image_bytes = f.read()
        ext = path.rsplit(".", 1)[-1].lower()
        mime = f"image/{'jpeg' if ext in ('jpg', 'jpeg') else ext}"
        ref_images.append(
            genai.types.VideoGenerationReferenceImage(
                image=genai.types.Image(image_bytes=image_bytes, mime_type=mime),
                reference_type="asset",
            )
        )
        logger.info("Loaded reference image: %s (%s, %d bytes)", name, mime, len(image_bytes))

    return ref_images


def _build_scene_prompt(scene: dict, characters: list, props: list, costumes: list,
                         prev_context: str | None, next_context: str | None) -> str:
    char_descriptions = []
    for cid in scene.get("characters", []):
        char = next((c for c in characters if c["id"] == cid), None)
        if char:
            if char.get("imageDescription") == "User uploaded" and char.get("imageUrl"):
                char_descriptions.append(f"{char['name']} (see reference image)")
            else:
                char_descriptions.append(f"{char['name']}: {char['appearance']}")

    prop_descriptions = []
    for pid in scene.get("props", []):
        prop = next((p for p in props if p["id"] == pid), None)
        if prop:
            prop_descriptions.append(f"{prop['name']}: {prop['description']}")

    costume_descriptions = []
    for costid in scene.get("costumes", []):
        cost = next((c for c in costumes if c["id"] == costid), None)
        if cost:
            costume_descriptions.append(f"{cost['name']}: {cost['description']}")

    prompt_parts = [
        f"Cinematic film scene: {scene['title']}.",
        f"Location: {scene['location']}.",
        f"Time of day: {scene['timeOfDay']}.",
        f"Mood and atmosphere: {scene['mood']}.",
        f"Action: {scene['actions']}.",
    ]

    if char_descriptions:
        prompt_parts.append(f"Characters present: {'; '.join(char_descriptions)}.")
    if costume_descriptions:
        prompt_parts.append(f"Costumes: {'; '.join(costume_descriptions)}.")
    if prop_descriptions:
        prompt_parts.append(f"Props visible: {'; '.join(prop_descriptions)}.")
    if scene.get("cameraNote"):
        prompt_parts.append(f"Camera style: {scene['cameraNote']}.")
    if prev_context:
        prompt_parts.append(f"Previous scene context for continuity: {prev_context}")
    if next_context:
        prompt_parts.append(f"Following scene context: {next_context}")

    prompt_parts.append(
        "Professional cinematography, film grain, cinematic color grading, "
        "high production value, photorealistic."
    )

    return " ".join(prompt_parts)


def _calc_extensions(estimated_duration: float) -> int:
    if estimated_duration <= INITIAL_CLIP_SECONDS:
        return 0
    return min(
        ceil((estimated_duration - INITIAL_CLIP_SECONDS) / EXTENSION_SECONDS),
        MAX_EXTENSIONS,
    )


def _build_video_config(reference_images: list | None = None) -> genai.types.GenerateVideosConfig:
    config = genai.types.GenerateVideosConfig(
        aspect_ratio="16:9",
        number_of_videos=1,
    )
    if reference_images:
        config.reference_images = reference_images
    return config


def _build_extension_config() -> genai.types.GenerateVideosConfig:
    return genai.types.GenerateVideosConfig(
        number_of_videos=1,
        resolution="720p",
    )


async def _request_extension_with_retry(client, video, prompt, config, ext_label):
    """Request a video extension, retrying on 'not processed' errors."""
    for attempt in range(1, EXTENSION_RETRY_ATTEMPTS + 1):
        try:
            return await asyncio.to_thread(
                client.models.generate_videos,
                model="veo-3.1-fast-generate-preview",
                video=video,
                prompt=prompt,
                config=config,
            )
        except Exception as e:
            is_not_processed = "processed" in str(e).lower()
            if is_not_processed and attempt < EXTENSION_RETRY_ATTEMPTS:
                wait = EXTENSION_RETRY_BACKOFF * attempt
                logger.warning(
                    "%s - video not yet processed, retry %d/%d in %ds",
                    ext_label, attempt, EXTENSION_RETRY_ATTEMPTS, wait,
                )
                await asyncio.sleep(wait)
                continue
            logger.error("%s - Veo extension request failed: %s", ext_label, e)
            _log_api_error_details(e)
            raise


async def _extend_video(client, video_obj, prompt: str, extensions: int, label: str):
    """Extend a Veo-generated video by calling the extension API in a loop.

    Returns the final video object and total poll count.
    """
    current_video = video_obj
    total_polls = 0

    for i in range(extensions):
        ext_label = f"{label} ext {i + 1}/{extensions}"

        if i > 0:
            logger.info("%s - waiting %ds for video processing...", ext_label, EXTENSION_PROCESSING_DELAY)
            await asyncio.sleep(EXTENSION_PROCESSING_DELAY)

        logger.info("%s - requesting extension...", ext_label)
        ext_config = _build_extension_config()
        operation = await _request_extension_with_retry(
            client, current_video, prompt, ext_config, ext_label,
        )

        operation, polls = await _poll_operation(client, operation, ext_label)
        total_polls += polls

        if not (operation.response and operation.response.generated_videos):
            logger.error("%s - extension returned no video, stopping", ext_label)
            break

        current_video = operation.response.generated_videos[0].video
        logger.info("%s - extension complete", ext_label)

    return current_video, total_polls


async def _poll_operation(client, operation, label: str):
    poll_count = 0
    while not operation.done:
        poll_count += 1
        logger.info("%s - polling Veo (attempt %d)...", label, poll_count)
        await asyncio.sleep(10)
        operation = await asyncio.to_thread(client.operations.get, operation)
    return operation, poll_count


async def _download_and_save(client, video, project_id: str, scene_id: str) -> tuple[str, int]:
    video_data = await asyncio.to_thread(client.files.download, file=video.video)
    video_bytes = video_data if isinstance(video_data, bytes) else b"".join(video_data)
    dest = f"projects/{project_id}/scenes/{scene_id}.mp4"
    url = upload_file(video_bytes, dest, "video/mp4")
    return url, len(video_bytes)


async def generate_scene_video(
    scene: dict,
    characters: list,
    props: list,
    costumes: list,
    project_id: str,
    prev_context: str | None = None,
    next_context: str | None = None,
) -> dict:
    client = get_client()
    prompt = _build_scene_prompt(scene, characters, props, costumes, prev_context, next_context)
    ref_images = _load_reference_images(scene, characters, props, costumes)

    estimated = scene.get("estimatedDuration", INITIAL_CLIP_SECONDS)
    extensions = _calc_extensions(estimated)

    logger.info(
        "Generating video for scene '%s' (prompt: %d chars, %d refs, estimated: %.0fs, extensions: %d)",
        scene.get("title"), len(prompt), len(ref_images), estimated, extensions,
    )
    logger.debug("Veo prompt: %s", prompt[:500])

    config = _build_video_config(ref_images or None)

    try:
        operation = await asyncio.to_thread(
            client.models.generate_videos,
            model="veo-3.1-fast-generate-preview",
            prompt=prompt,
            config=config,
        )
    except Exception as e:
        logger.error("Veo API request failed for scene '%s': %s", scene.get("title"), e)
        _log_api_error_details(e)
        raise

    label = f"Scene '{scene.get('title')}'"
    operation, poll_count = await _poll_operation(client, operation, label)

    result = {"videoUrl": None, "thumbnailUrl": None, "duration": None}

    if operation.response and operation.response.generated_videos:
        video = operation.response.generated_videos[0]

        if extensions > 0:
            logger.info("%s - extending video (%d extensions for ~%.0fs total)", label, extensions, estimated)
            final_video, ext_polls = await _extend_video(
                client, video.video, prompt, extensions, label,
            )
            poll_count += ext_polls
            final_duration = INITIAL_CLIP_SECONDS + extensions * EXTENSION_SECONDS

            video_data = await asyncio.to_thread(client.files.download, file=final_video)
            video_bytes = video_data if isinstance(video_data, bytes) else b"".join(video_data)
            dest = f"projects/{project_id}/scenes/{scene['id']}.mp4"
            url = upload_file(video_bytes, dest, "video/mp4")
            result["videoUrl"] = url
            result["duration"] = float(final_duration)
            logger.info("%s - extended video saved (%d bytes, %.0fs, %d polls)", label, len(video_bytes), final_duration, poll_count)
        else:
            logger.info("%s - downloading generated video (no extensions needed)", label)
            url, nbytes = await _download_and_save(client, video, project_id, scene["id"])
            result["videoUrl"] = url
            result["duration"] = float(INITIAL_CLIP_SECONDS)
            logger.info("%s - video saved (%d bytes, %d polls)", label, nbytes, poll_count)
    else:
        logger.error("%s - Veo returned no video! Operation response: %s", label, operation.response)

    return result


async def regenerate_scene_video(
    scene: dict,
    characters: list,
    props: list,
    costumes: list,
    project_id: str,
    modified_prompt: str | None = None,
) -> dict:
    client = get_client()
    ref_images = _load_reference_images(scene, characters, props, costumes)

    estimated = scene.get("estimatedDuration", INITIAL_CLIP_SECONDS)
    extensions = _calc_extensions(estimated)

    if modified_prompt:
        prompt = modified_prompt
        logger.info("Regenerating scene '%s' with modified prompt (%d chars, %d refs, extensions: %d)", scene.get("title"), len(prompt), len(ref_images), extensions)
    else:
        prompt = _build_scene_prompt(scene, characters, props, costumes, None, None)
        logger.info("Regenerating scene '%s' with original prompt (%d chars, %d refs, extensions: %d)", scene.get("title"), len(prompt), len(ref_images), extensions)

    config = _build_video_config(ref_images or None)

    try:
        operation = await asyncio.to_thread(
            client.models.generate_videos,
            model="veo-3.1-fast-generate-preview",
            prompt=prompt,
            config=config,
        )
    except Exception as e:
        logger.error("Veo API request failed for scene '%s' (regen): %s", scene.get("title"), e)
        _log_api_error_details(e)
        raise

    label = f"Scene '{scene.get('title')}' regen"
    operation, poll_count = await _poll_operation(client, operation, label)

    result = {"videoUrl": None, "thumbnailUrl": None, "duration": None}

    if operation.response and operation.response.generated_videos:
        video = operation.response.generated_videos[0]

        if extensions > 0:
            logger.info("%s - extending video (%d extensions for ~%.0fs total)", label, extensions, estimated)
            final_video, ext_polls = await _extend_video(
                client, video.video, prompt, extensions, label,
            )
            poll_count += ext_polls
            final_duration = INITIAL_CLIP_SECONDS + extensions * EXTENSION_SECONDS

            video_data = await asyncio.to_thread(client.files.download, file=final_video)
            video_bytes = video_data if isinstance(video_data, bytes) else b"".join(video_data)
            dest = f"projects/{project_id}/scenes/{scene['id']}.mp4"
            url = upload_file(video_bytes, dest, "video/mp4")
            result["videoUrl"] = url
            result["duration"] = float(final_duration)
            logger.info("%s - extended video saved (%d bytes, %.0fs, %d polls)", label, len(video_bytes), final_duration, poll_count)
        else:
            logger.info("%s - downloading video", label)
            url, nbytes = await _download_and_save(client, video, project_id, scene["id"])
            result["videoUrl"] = url
            result["duration"] = float(INITIAL_CLIP_SECONDS)
            logger.info("%s - saved (%d bytes, %d polls)", label, nbytes, poll_count)
    else:
        logger.error("%s - Veo returned no video!", label)

    return result
