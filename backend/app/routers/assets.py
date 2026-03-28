import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
from app.services import storage_service, image_service

logger = logging.getLogger("filmai.assets")
router = APIRouter()

VALID_ASSET_TYPES = {"characters", "props", "costumes"}


async def _generate_all_assets(project_id: str):
    try:
        storage_service.update_project(project_id, {"status": "assets_generating"})
        project = storage_service.get_project(project_id)
        script_data = project.get("scriptData", {})

        characters = script_data.get("characters", [])
        props = script_data.get("props", [])
        costumes = script_data.get("costumes", [])

        logger.info(
            "[%s] Starting asset generation: %d characters, %d props, %d costumes",
            project_id[:8], len(characters), len(props), len(costumes),
        )

        for i, char in enumerate(characters):
            if not char.get("imageUrl"):
                logger.info("[%s] Generating character image %d/%d: %s", project_id[:8], i + 1, len(characters), char["name"])
                url = await image_service.generate_character_image(char, project_id)
                char["imageUrl"] = url
                char["imageDescription"] = char.get("appearance", "")
                storage_service.update_project(project_id, {"scriptData.characters": characters})
                logger.info("[%s] Character image saved: %s", project_id[:8], char["name"])

        for i, prop in enumerate(props):
            if not prop.get("imageUrl"):
                logger.info("[%s] Generating prop image %d/%d: %s", project_id[:8], i + 1, len(props), prop["name"])
                url = await image_service.generate_prop_image(prop, project_id)
                prop["imageUrl"] = url
                storage_service.update_project(project_id, {"scriptData.props": props})
                logger.info("[%s] Prop image saved: %s", project_id[:8], prop["name"])

        for i, costume in enumerate(costumes):
            if not costume.get("imageUrl"):
                linked_char = next(
                    (c for c in characters if c["id"] == costume.get("characterId")),
                    None,
                )
                logger.info("[%s] Generating costume image %d/%d: %s", project_id[:8], i + 1, len(costumes), costume["name"])
                url = await image_service.generate_costume_image(
                    costume, linked_char, project_id
                )
                costume["imageUrl"] = url
                storage_service.update_project(project_id, {"scriptData.costumes": costumes})
                logger.info("[%s] Costume image saved: %s", project_id[:8], costume["name"])

        storage_service.update_project(project_id, {"status": "assets_ready"})
        logger.info("[%s] All assets generated. Status -> assets_ready", project_id[:8])
    except Exception as e:
        logger.error("[%s] Asset generation FAILED: %s", project_id[:8], e, exc_info=True)
        storage_service.update_project(project_id, {"status": "analyzed"})


@router.post("/generate/{project_id}")
async def generate_assets(project_id: str, background_tasks: BackgroundTasks):
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.get("scriptData"):
        raise HTTPException(status_code=400, detail="Script not analyzed yet")

    logger.info("[%s] Queuing asset generation in background", project_id[:8])
    background_tasks.add_task(_generate_all_assets, project_id)
    return {"status": "assets_generating", "message": "Asset generation started"}


@router.get("/{project_id}")
async def get_assets(project_id: str):
    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    script_data = project.get("scriptData", {})
    return {
        "characters": script_data.get("characters", []),
        "props": script_data.get("props", []),
        "costumes": script_data.get("costumes", []),
    }


@router.post("/{project_id}/upload/{asset_type}/{asset_id}")
async def upload_asset(
    project_id: str,
    asset_type: str,
    asset_id: str,
    file: UploadFile = File(...),
):
    if asset_type not in VALID_ASSET_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid asset type. Must be one of: {', '.join(VALID_ASSET_TYPES)}")

    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    script_data = project.get("scriptData", {})
    assets = script_data.get(asset_type, [])
    asset = next((a for a in assets if a["id"] == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset '{asset_id}' not found in {asset_type}")

    file_bytes = await file.read()
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "png"
    dest = f"projects/{project_id}/assets/{asset_type}/{asset_id}.{ext}"
    content_type = file.content_type or "image/png"
    url = storage_service.upload_file(file_bytes, dest, content_type)

    asset["imageUrl"] = url
    if asset_type == "characters":
        asset["imageDescription"] = "User uploaded"

    storage_service.update_project(project_id, {f"scriptData.{asset_type}": assets})
    logger.info("[%s] User uploaded %s asset: %s (%d bytes)", project_id[:8], asset_type, asset_id, len(file_bytes))

    return {"status": "uploaded", "imageUrl": url}


@router.delete("/{project_id}/{asset_type}/{asset_id}/image")
async def remove_asset_image(project_id: str, asset_type: str, asset_id: str):
    if asset_type not in VALID_ASSET_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid asset type. Must be one of: {', '.join(VALID_ASSET_TYPES)}")

    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    script_data = project.get("scriptData", {})
    assets = script_data.get(asset_type, [])
    asset = next((a for a in assets if a["id"] == asset_id), None)
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset '{asset_id}' not found in {asset_type}")

    asset["imageUrl"] = None
    if asset_type == "characters":
        asset["imageDescription"] = None

    storage_service.update_project(project_id, {f"scriptData.{asset_type}": assets})
    logger.info("[%s] Removed %s asset image: %s", project_id[:8], asset_type, asset_id)

    return {"status": "removed"}


@router.delete("/{project_id}/{asset_type}/{asset_id}")
async def delete_asset(project_id: str, asset_type: str, asset_id: str):
    if asset_type not in VALID_ASSET_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid asset type. Must be one of: {', '.join(VALID_ASSET_TYPES)}")

    project = storage_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    script_data = project.get("scriptData", {})
    assets = script_data.get(asset_type, [])
    original_len = len(assets)
    assets = [a for a in assets if a["id"] != asset_id]

    if len(assets) == original_len:
        raise HTTPException(status_code=404, detail=f"Asset '{asset_id}' not found in {asset_type}")

    scenes = script_data.get("scenes", [])
    for scene in scenes:
        key = asset_type if asset_type != "costumes" else "costumes"
        if asset_id in scene.get(key, []):
            scene[key] = [sid for sid in scene[key] if sid != asset_id]

    storage_service.update_project(project_id, {
        f"scriptData.{asset_type}": assets,
        "scriptData.scenes": scenes,
    })
    logger.info("[%s] Deleted %s asset: %s", project_id[:8], asset_type, asset_id)

    return {"status": "deleted"}
