import asyncio
import logging
import time
from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
from app.models.schemas import EditRequest, TransformRequest
from app.services import storage_service, veo_service, gemini_service

logger = logging.getLogger("filmai.scenes")
router = APIRouter()

MAX_CONCURRENT_SCENES = 3


def _invalidate_export(project_id: str):
    """Clear stale export video when any scene video changes."""
    storage_service.update_project(project_id, {"exportVideoUrl": None})


async def _generate_single_scene(
    semaphore: asyncio.Semaphore,
    scene: dict,
    index: int,
    total: int,
    characters: list,
    props: list,
    costumes: list,
    project_id: str,
    scenes: list,
):
    async with semaphore:
        logger.info("[%s] Generating scene %d/%d: %s", project_id[:8], index + 1, total, scene.get("title", "Untitled"))
        scene["status"] = "generating"
        storage_service.update_project(project_id, {"scriptData.scenes": scenes})

        result = await veo_service.generate_scene_video(
            scene=scene,
            characters=characters,
            props=props,
            costumes=costumes,
            project_id=project_id,
            prev_context=scene.get("previousSceneContext"),
            next_context=scene.get("nextSceneContext"),
        )

        scene["videoUrl"] = result["videoUrl"]
        scene["thumbnailUrl"] = result.get("thumbnailUrl")
        scene["duration"] = result.get("duration")
        scene["veoVideoUri"] = result.get("veoVideoUri")
        scene["status"] = "generated"
        _invalidate_export(project_id)
        storage_service.update_project(project_id, {"scriptData.scenes": scenes})
        logger.info("[%s] Scene %d/%d generated: %s", project_id[:8], index + 1, total, scene.get("title"))


async def _generate_all_scenes(project_id: str):
    try:
        storage_service.update_project(project_id, {"status": "scenes_generating"})
        project = storage_service.get_project(project_id)
        script_data = project.get("scriptData", {})

        characters = script_data.get("characters", [])
        props = script_data.get("props", [])
        costumes = script_data.get("costumes", [])
        scenes = script_data.get("scenes", [])

        pending = [(i, s) for i, s in enumerate(scenes) if not s.get("videoUrl")]
        logger.info("[%s] Starting scene generation: %d to generate (%d total)", project_id[:8], len(pending), len(scenes))

        semaphore = asyncio.Semaphore(MAX_CONCURRENT_SCENES)
        tasks = [
            _generate_single_scene(
                semaphore, scene, i, len(scenes),
                characters, props, costumes, project_id, scenes,
            )
            for i, scene in pending
        ]
        await asyncio.gather(*tasks)

        storage_service.update_project(project_id, {
            "status": "scenes_ready",
            "scriptData.scenes": scenes,
        })
        logger.info("[%s] All scenes generated. Status -> scenes_ready", project_id[:8])
    except Exception as e:
        logger.error("[%s] Scene generation FAILED: %s", project_id[:8], e, exc_info=True)
        storage_service.update_project(project_id, {"status": "assets_ready"})


@router.post("/generate/{project_id}")
async def generate_scenes(project_id: str, background_tasks: BackgroundTasks):
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    logger.info("[%s] Queuing scene generation in background", project_id[:8])
    background_tasks.add_task(_generate_all_scenes, project_id)
    return {"status": "scenes_generating", "message": "Scene generation started"}


@router.get("/{project_id}")
async def get_scenes(project_id: str):
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    script_data = project.get("scriptData", {})
    return {"scenes": script_data.get("scenes", [])}


@router.post("/{scene_id}/regenerate")
async def regenerate_scene(scene_id: str, project_id: str, background_tasks: BackgroundTasks):
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    script_data = project.get("scriptData", {})
    scenes = script_data.get("scenes", [])
    scene = next((s for s in scenes if s["id"] == scene_id), None)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    async def _regen():
        logger.info("[%s] Regenerating scene: %s (%s)", project_id[:8], scene_id, scene.get("title"))
        scene["status"] = "generating"
        storage_service.update_project(project_id, {"scriptData.scenes": scenes})

        result = await veo_service.regenerate_scene_video(
            scene=scene,
            characters=script_data.get("characters", []),
            props=script_data.get("props", []),
            costumes=script_data.get("costumes", []),
            project_id=project_id,
        )
        scene["videoUrl"] = result["videoUrl"]
        scene["thumbnailUrl"] = result.get("thumbnailUrl")
        scene["duration"] = result.get("duration")
        scene["veoVideoUri"] = result.get("veoVideoUri")
        scene["status"] = "generated"
        _invalidate_export(project_id)
        storage_service.update_project(project_id, {"scriptData.scenes": scenes})
        logger.info("[%s] Scene regenerated: %s", project_id[:8], scene_id)

    background_tasks.add_task(_regen)
    return {"status": "generating"}


@router.post("/{scene_id}/edit")
async def edit_scene(scene_id: str, project_id: str, body: EditRequest, background_tasks: BackgroundTasks):
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    script_data = project.get("scriptData", {})
    scenes = script_data.get("scenes", [])
    scene = next((s for s in scenes if s["id"] == scene_id), None)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    async def _apply_edit():
        logger.info("[%s] Interpreting edit for scene %s: '%s'", project_id[:8], scene_id, body.instruction[:100])
        interpretation = await gemini_service.interpret_edit_instruction(
            body.instruction, scene
        )
        logger.info("[%s] Edit interpretation: regenerate=%s, transforms=%s", project_id[:8], interpretation.get("regenerate"), interpretation.get("transforms"))

        if interpretation.get("transforms"):
            transforms = interpretation["transforms"]
            edits = scene.get("edits", {})
            for key in ["brightness", "aiBlend", "blurDepth", "colorGrade", "backgroundShift"]:
                if transforms.get(key) is not None:
                    edits[key] = transforms[key]
            scene["edits"] = edits

        if interpretation.get("regenerate"):
            logger.info("[%s] Regenerating scene %s based on edit instruction", project_id[:8], scene_id)
            scene["status"] = "generating"
            storage_service.update_project(project_id, {"scriptData.scenes": scenes})

            result = await veo_service.regenerate_scene_video(
                scene=scene,
                characters=script_data.get("characters", []),
                props=script_data.get("props", []),
                costumes=script_data.get("costumes", []),
                project_id=project_id,
                modified_prompt=interpretation.get("prompt_modification"),
            )
            scene["videoUrl"] = result["videoUrl"]
            scene["duration"] = result.get("duration")
            scene["veoVideoUri"] = result.get("veoVideoUri")
            scene["status"] = "generated"
            _invalidate_export(project_id)
            logger.info("[%s] Scene %s regenerated from edit", project_id[:8], scene_id)

        storage_service.update_project(project_id, {"scriptData.scenes": scenes})

    background_tasks.add_task(_apply_edit)
    return {"status": "editing", "message": "Edit instruction being processed"}


@router.post("/{scene_id}/transform")
async def transform_scene(scene_id: str, project_id: str, body: TransformRequest):
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    script_data = project.get("scriptData", {})
    scenes = script_data.get("scenes", [])
    scene = next((s for s in scenes if s["id"] == scene_id), None)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    edits = scene.get("edits", {})
    if body.brightness is not None:
        edits["brightness"] = body.brightness
    if body.aiBlend is not None:
        edits["aiBlend"] = body.aiBlend
    if body.blurDepth is not None:
        edits["blurDepth"] = body.blurDepth
    if body.colorGrade is not None:
        edits["colorGrade"] = body.colorGrade
    if body.backgroundShift is not None:
        edits["backgroundShift"] = body.backgroundShift

    scene["edits"] = edits
    storage_service.update_project(project_id, {"scriptData.scenes": scenes})
    logger.info("[%s] Scene %s transforms saved: %s", project_id[:8], scene_id, edits)

    return {"status": "updated", "edits": edits}


@router.post("/{scene_id}/upload-footage")
async def upload_scene_footage(
    scene_id: str,
    project_id: str,
    file: UploadFile = File(...),
):
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    script_data = project.get("scriptData", {})
    scenes = script_data.get("scenes", [])
    scene = next((s for s in scenes if s["id"] == scene_id), None)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    file_bytes = await file.read()
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "mp4"
    dest = f"projects/{project_id}/scenes/{scene_id}/footage.{ext}"
    content_type = file.content_type or "video/mp4"
    url = storage_service.upload_file(file_bytes, dest, content_type)

    scene["videoUrl"] = f"{url}?t={int(time.time())}"
    scene["veoVideoUri"] = None
    scene["status"] = "generated"
    _invalidate_export(project_id)
    storage_service.update_project(project_id, {"scriptData.scenes": scenes})
    logger.info("[%s] Raw footage uploaded for scene %s (%d bytes)", project_id[:8], scene_id, len(file_bytes))

    return {"status": "uploaded", "videoUrl": url}


@router.delete("/{scene_id}/footage")
async def remove_scene_footage(scene_id: str, project_id: str):
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    script_data = project.get("scriptData", {})
    scenes = script_data.get("scenes", [])
    scene = next((s for s in scenes if s["id"] == scene_id), None)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    scene["videoUrl"] = None
    scene["thumbnailUrl"] = None
    scene["veoVideoUri"] = None
    scene["duration"] = None
    scene["status"] = "pending"
    _invalidate_export(project_id)
    storage_service.update_project(project_id, {"scriptData.scenes": scenes})
    logger.info("[%s] Footage removed for scene %s", project_id[:8], scene_id)

    return {"status": "removed"}
