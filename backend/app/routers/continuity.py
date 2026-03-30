import asyncio
import os
import uuid
import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models.schemas import ContinuityCorrectRequest
from app.services import storage_service, gemini_service, veo_service

logger = logging.getLogger("filmai.continuity")
router = APIRouter()

MAX_CONCURRENT_ANALYSES = 3


def _resolve_video_path(video_url: str | None) -> str | None:
    """Convert a video storage URL to a local file path."""
    if not video_url:
        return None
    url_clean = video_url.split("?")[0]
    prefix = "/files/"
    idx = url_clean.find(prefix)
    if idx == -1:
        return None
    relative = url_clean[idx + len(prefix):]
    full_path = os.path.join(storage_service.DATA_DIR, relative)
    return full_path if os.path.exists(full_path) else None


async def _analyze_single_scene(
    semaphore: asyncio.Semaphore,
    scene: dict,
    prev_scene: dict | None,
    characters: list,
    props: list,
    costumes: list,
    project_id: str,
    continuity_data: list,
):
    async with semaphore:
        scene_id = scene["id"]
        scene_video = _resolve_video_path(scene.get("videoUrl"))
        if not scene_video:
            logger.warning("[%s] No video file for scene %s, skipping", project_id[:8], scene_id)
            return

        prev_video = _resolve_video_path(prev_scene.get("videoUrl")) if prev_scene else None

        logger.info(
            "[%s] Analyzing continuity for scene %s (%s) prev=%s",
            project_id[:8], scene_id, scene.get("title"), bool(prev_video),
        )

        try:
            result = await gemini_service.analyze_continuity(
                scene=scene,
                scene_video_path=scene_video,
                prev_scene=prev_scene,
                prev_video_path=prev_video,
                characters=characters,
                props=props,
                costumes=costumes,
            )

            issues = result.get("issues", [])
            for i, issue in enumerate(issues):
                if not issue.get("id"):
                    issue["id"] = f"{scene_id}-issue-{i}"

            has_critical = any(iss.get("severity") == "critical" for iss in issues)
            status = "no_issues" if len(issues) == 0 else ("critical" if has_critical else "warning")

            entry = {
                "sceneId": scene_id,
                "status": status,
                "score": result.get("score", 100),
                "issues": issues,
                "comparedWith": f"Scene {prev_scene.get('number')}" if prev_scene else None,
                "summary": result.get("summary", ""),
            }

            existing_idx = next((i for i, c in enumerate(continuity_data) if c["sceneId"] == scene_id), None)
            if existing_idx is not None:
                continuity_data[existing_idx] = entry
            else:
                continuity_data.append(entry)

            storage_service.update_project(project_id, {"continuityData": continuity_data})
            logger.info("[%s] Continuity done for scene %s: score=%s issues=%d", project_id[:8], scene_id, entry["score"], len(issues))

        except Exception as e:
            logger.error("[%s] Continuity analysis failed for scene %s: %s", project_id[:8], scene_id, e, exc_info=True)
            entry = {
                "sceneId": scene_id,
                "status": "error",
                "score": 0,
                "issues": [],
                "comparedWith": f"Scene {prev_scene.get('number')}" if prev_scene else None,
                "summary": f"Analysis failed: {str(e)[:200]}",
            }
            existing_idx = next((i for i, c in enumerate(continuity_data) if c["sceneId"] == scene_id), None)
            if existing_idx is not None:
                continuity_data[existing_idx] = entry
            else:
                continuity_data.append(entry)
            storage_service.update_project(project_id, {"continuityData": continuity_data})


async def _analyze_all_continuity(project_id: str):
    try:
        storage_service.update_project(project_id, {"continuityStatus": "analyzing"})
        project = storage_service.get_project(project_id)
        script_data = project.get("scriptData", {})

        characters = script_data.get("characters", [])
        props = script_data.get("props", [])
        costumes = script_data.get("costumes", [])
        scenes = script_data.get("scenes", [])

        scenes_with_video = [s for s in scenes if s.get("videoUrl")]
        logger.info("[%s] Starting continuity analysis: %d scenes with video", project_id[:8], len(scenes_with_video))

        continuity_data = project.get("continuityData", [])

        semaphore = asyncio.Semaphore(MAX_CONCURRENT_ANALYSES)
        tasks = []
        for i, scene in enumerate(scenes_with_video):
            prev = scenes_with_video[i - 1] if i > 0 else None
            tasks.append(
                _analyze_single_scene(
                    semaphore, scene, prev,
                    characters, props, costumes,
                    project_id, continuity_data,
                )
            )
        await asyncio.gather(*tasks)

        storage_service.update_project(project_id, {"continuityStatus": "ready"})
        logger.info("[%s] Continuity analysis complete for all scenes", project_id[:8])
    except Exception as e:
        logger.error("[%s] Continuity analysis FAILED: %s", project_id[:8], e, exc_info=True)
        storage_service.update_project(project_id, {"continuityStatus": "error"})


@router.post("/analyze/{project_id}")
async def analyze_continuity(project_id: str, background_tasks: BackgroundTasks):
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    scenes = project.get("scriptData", {}).get("scenes", [])
    scenes_with_video = [s for s in scenes if s.get("videoUrl")]
    if not scenes_with_video:
        raise HTTPException(status_code=400, detail="No scenes with video to analyze")

    logger.info("[%s] Queuing continuity analysis (%d scenes)", project_id[:8], len(scenes_with_video))
    background_tasks.add_task(_analyze_all_continuity, project_id)
    return {
        "status": "analyzing",
        "message": f"Continuity analysis started for {len(scenes_with_video)} scenes",
    }


@router.get("/{project_id}")
async def get_continuity(project_id: str):
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return {
        "status": project.get("continuityStatus", "idle"),
        "data": project.get("continuityData", []),
    }


@router.post("/{project_id}/correct/{scene_id}")
async def correct_scene(
    project_id: str,
    scene_id: str,
    body: ContinuityCorrectRequest,
    background_tasks: BackgroundTasks,
):
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    script_data = project.get("scriptData", {})
    scenes = script_data.get("scenes", [])
    scene = next((s for s in scenes if s["id"] == scene_id), None)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    continuity_data = project.get("continuityData", [])
    scene_cont = next((c for c in continuity_data if c["sceneId"] == scene_id), None)
    if not scene_cont or not scene_cont.get("issues"):
        raise HTTPException(status_code=400, detail="No continuity issues found for this scene")

    if body.issue_ids:
        issues_to_fix = [i for i in scene_cont["issues"] if i["id"] in body.issue_ids]
        if not issues_to_fix:
            raise HTTPException(status_code=400, detail="None of the specified issue IDs were found")
    else:
        issues_to_fix = scene_cont["issues"]

    logger.info(
        "[%s] Queuing continuity correction for scene %s (%d issues)",
        project_id[:8], scene_id, len(issues_to_fix),
    )

    async def _apply_correction():
        try:
            scene["status"] = "generating"
            storage_service.update_project(project_id, {"scriptData.scenes": scenes})

            result = await veo_service.correct_scene_video(
                scene=scene,
                characters=script_data.get("characters", []),
                props=script_data.get("props", []),
                costumes=script_data.get("costumes", []),
                project_id=project_id,
                issues=issues_to_fix,
            )

            scene["videoUrl"] = result["videoUrl"]
            scene["duration"] = result.get("duration")
            scene["veoVideoUri"] = result.get("veoVideoUri")
            scene["status"] = "generated"
            storage_service.update_project(project_id, {"scriptData.scenes": scenes})

            for issue in scene_cont["issues"]:
                if not body.issue_ids or issue["id"] in body.issue_ids:
                    issue["status"] = "corrected"

            storage_service.update_project(project_id, {"continuityData": continuity_data})
            logger.info("[%s] Continuity correction complete for scene %s", project_id[:8], scene_id)
        except Exception as e:
            logger.error("[%s] Continuity correction FAILED for scene %s: %s", project_id[:8], scene_id, e, exc_info=True)
            scene["status"] = "generated"
            storage_service.update_project(project_id, {"scriptData.scenes": scenes})

    background_tasks.add_task(_apply_correction)
    return {
        "status": "correcting",
        "message": f"Applying {len(issues_to_fix)} continuity correction(s) for scene",
        "issueCount": len(issues_to_fix),
    }
