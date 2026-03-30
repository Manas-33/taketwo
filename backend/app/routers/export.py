import logging
import time
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.services import storage_service, video_assembly

logger = logging.getLogger("filmai.export")
router = APIRouter()


def _video_blob_path(scene: dict, project_id: str) -> str | None:
    """Extract the storage-relative path from a scene's videoUrl."""
    video_url = scene.get("videoUrl")
    if not video_url:
        return None
    url_clean = video_url.split("?")[0]
    prefix = "/files/"
    idx = url_clean.find(prefix)
    if idx != -1:
        return url_clean[idx + len(prefix):]
    return f"projects/{project_id}/scenes/{scene['id']}.mp4"


async def _run_assembly(project_id: str):
    try:
        storage_service.update_project(project_id, {"status": "assembling"})
        project = storage_service.get_project(project_id)
        script_data = project.get("scriptData", {})
        scenes = script_data.get("scenes", [])

        video_paths = []
        for scene in sorted(scenes, key=lambda s: s.get("number", 0)):
            blob_path = _video_blob_path(scene, project_id)
            if blob_path:
                video_paths.append(blob_path)

        logger.info("[%s] Assembling %d scene videos", project_id[:8], len(video_paths))

        if not video_paths:
            logger.warning("[%s] No scene videos to assemble", project_id[:8])
            storage_service.update_project(project_id, {"status": "scenes_ready"})
            return

        final_url = await video_assembly.assemble_scenes(video_paths, project_id)
        storage_service.update_project(project_id, {
            "status": "ready",
            "exportVideoUrl": f"{final_url}?t={int(time.time())}",
        })
        logger.info("[%s] Final assembly complete: %s", project_id[:8], final_url)
    except Exception as e:
        logger.error("[%s] Assembly FAILED: %s", project_id[:8], e, exc_info=True)
        storage_service.update_project(project_id, {"status": "scenes_ready"})


@router.post("/assemble/{project_id}")
async def assemble(project_id: str, background_tasks: BackgroundTasks):
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    logger.info("[%s] Queuing final assembly in background", project_id[:8])
    background_tasks.add_task(_run_assembly, project_id)
    return {"status": "assembling", "message": "Final assembly started"}


@router.get("/status/{project_id}")
async def export_status(project_id: str):
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return {
        "status": project.get("status"),
        "exportVideoUrl": project.get("exportVideoUrl"),
    }
