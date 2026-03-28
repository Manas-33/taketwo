import asyncio
import logging
from fastapi import APIRouter
from google import genai
from app.config import GOOGLE_API_KEY
from app.services.storage_service import upload_file

logger = logging.getLogger("filmai.test")
router = APIRouter()


@router.post("/veo")
async def test_veo():
    logger.info("Veo test: starting")
    client = genai.Client(api_key=GOOGLE_API_KEY)

    operation = await asyncio.to_thread(
        client.models.generate_videos,
        model="veo-3.1-fast-generate-preview",
        prompt="A gentle ocean wave rolling onto a sandy beach at golden hour. Cinematic, slow motion.",
        config=genai.types.GenerateVideosConfig(
            aspect_ratio="16:9",
            number_of_videos=1,
        ),
    )

    poll_count = 0
    while not operation.done:
        poll_count += 1
        logger.info("Veo test: polling (attempt %d)...", poll_count)
        await asyncio.sleep(10)
        operation = await asyncio.to_thread(client.operations.get, operation)

    if operation.response and operation.response.generated_videos:
        video = operation.response.generated_videos[0]
        video_data = await asyncio.to_thread(client.files.download, file=video.video)
        video_bytes = video_data if isinstance(video_data, bytes) else b"".join(video_data)
        url = upload_file(video_bytes, "test/veo_test.mp4", "video/mp4")
        logger.info("Veo test: success (%d bytes, %d polls)", len(video_bytes), poll_count)
        return {"status": "success", "videoUrl": url, "bytes": len(video_bytes), "polls": poll_count}

    logger.error("Veo test: no video returned. Response: %s", operation.response)
    return {"status": "error", "message": "Veo returned no video"}
