import io
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from app.services import storage_service, gemini_service
from PyPDF2 import PdfReader

logger = logging.getLogger("filmai.script")
router = APIRouter()


def _extract_text(file_bytes: bytes, filename: str) -> str:
    if filename.lower().endswith(".pdf"):
        logger.info("Extracting text from PDF: %s", filename)
        reader = PdfReader(io.BytesIO(file_bytes))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        logger.info("Extracted %d characters from %d pages", len(text), len(reader.pages))
        return text
    logger.info("Reading plain text file: %s", filename)
    return file_bytes.decode("utf-8", errors="replace")


async def _run_analysis(project_id: str, script_text: str):
    try:
        logger.info("[%s] Starting script analysis (%d chars)", project_id[:8], len(script_text))
        storage_service.update_project(project_id, {"status": "analyzing"})
        result = await gemini_service.analyze_script(script_text)

        characters = result.get("characters", [])
        props = result.get("props", [])
        costumes = result.get("costumes", [])
        scenes = result.get("scenes", [])
        logger.info(
            "[%s] Analysis complete: %d characters, %d props, %d costumes, %d scenes",
            project_id[:8], len(characters), len(props), len(costumes), len(scenes),
        )

        for i, scene in enumerate(scenes):
            if i > 0:
                prev = scenes[i - 1]
                scene["previousSceneContext"] = f"{prev['title']}: {prev['actions'][:120]}"
            if i < len(scenes) - 1:
                nxt = scenes[i + 1]
                scene["nextSceneContext"] = f"{nxt['title']}: {nxt['actions'][:120]}"

            scene.setdefault("estimatedDuration", scene.get("estimatedDuration", 8))
            scene.setdefault("videoUrl", None)
            scene.setdefault("thumbnailUrl", None)
            scene.setdefault("duration", None)
            scene.setdefault("status", "pending")
            scene.setdefault("edits", {
                "brightness": 100, "aiBlend": 50, "blurDepth": 0,
                "colorGrade": None, "backgroundShift": None
            })

        for char in characters:
            char.setdefault("imageUrl", None)
            char.setdefault("imageDescription", None)

        for prop in props:
            prop.setdefault("imageUrl", None)

        for costume in costumes:
            costume.setdefault("imageUrl", None)

        script_data = {
            "rawText": script_text,
            "characters": characters,
            "props": props,
            "costumes": costumes,
            "scenes": scenes,
        }

        storage_service.update_project(project_id, {
            "title": result.get("title", "Untitled Project"),
            "status": "analyzed",
            "scriptData": script_data,
        })
        logger.info("[%s] Script analysis saved. Status -> analyzed", project_id[:8])
    except Exception as e:
        logger.error("[%s] Script analysis FAILED: %s", project_id[:8], e, exc_info=True)
        storage_service.update_project(project_id, {"status": "uploaded"})


@router.post("/upload")
async def upload_script(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    file_bytes = await file.read()
    file_size_mb = len(file_bytes) / (1024 * 1024)
    logger.info("Upload received: %s (%.2f MB)", file.filename, file_size_mb)

    if len(file_bytes) > 25 * 1024 * 1024:
        logger.warning("File rejected: too large (%.2f MB)", file_size_mb)
        raise HTTPException(status_code=400, detail="File too large (max 25MB)")

    project = storage_service.create_project("Untitled Project")
    project_id = project["projectId"]
    logger.info("Project created: %s", project_id)

    dest = f"projects/{project_id}/script/{file.filename}"
    storage_service.upload_file(file_bytes, dest, file.content_type or "application/octet-stream")
    logger.info("[%s] Script file saved to %s", project_id[:8], dest)

    script_text = _extract_text(file_bytes, file.filename)
    storage_service.update_project(project_id, {
        "scriptData": {"rawText": script_text, "characters": [], "props": [], "costumes": [], "scenes": []}
    })

    return {"projectId": project_id, "status": "uploaded", "message": "Script uploaded successfully"}


@router.post("/analyze/{project_id}")
async def analyze(project_id: str, background_tasks: BackgroundTasks):
    project = storage_service.get_project(project_id)
    if not project:
        logger.warning("Analyze request for non-existent project: %s", project_id)
        raise HTTPException(status_code=404, detail="Project not found")

    script_data = project.get("scriptData")
    if not script_data or not script_data.get("rawText"):
        logger.warning("[%s] Analyze request but no script text found", project_id[:8])
        raise HTTPException(status_code=400, detail="No script text found")

    logger.info("[%s] Queuing script analysis in background", project_id[:8])
    background_tasks.add_task(_run_analysis, project_id, script_data["rawText"])
    return {"status": "analyzing", "message": "Script analysis started"}


@router.get("/project/{project_id}")
async def get_project(project_id: str):
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
