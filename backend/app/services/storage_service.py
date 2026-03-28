import os
import json
import uuid
import logging
from datetime import datetime, timezone
from app.config import STORAGE_BASE_URL

logger = logging.getLogger("filmai.storage")

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")


def _project_dir(project_id: str) -> str:
    return os.path.join(DATA_DIR, "projects", project_id)


def _project_file(project_id: str) -> str:
    return os.path.join(_project_dir(project_id), "project.json")


def _save_project(project_id: str, project: dict):
    dirpath = _project_dir(project_id)
    os.makedirs(dirpath, exist_ok=True)
    with open(_project_file(project_id), "w") as f:
        json.dump(project, f, indent=2, default=str)


def _deep_update(target: dict, updates: dict):
    for key, value in updates.items():
        if "." in key:
            parts = key.split(".", 1)
            if parts[0] in target and isinstance(target[parts[0]], dict):
                _deep_update(target[parts[0]], {parts[1]: value})
            else:
                target[parts[0]] = {}
                _deep_update(target[parts[0]], {parts[1]: value})
        else:
            target[key] = value


def create_project(title: str) -> dict:
    project_id = str(uuid.uuid4())
    project = {
        "projectId": project_id,
        "title": title,
        "status": "uploaded",
        "scriptData": None,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "exportVideoUrl": None,
    }
    _save_project(project_id, project)
    logger.info("Project created: %s ('%s')", project_id, title)
    return project


def get_project(project_id: str) -> dict | None:
    path = _project_file(project_id)
    if not os.path.exists(path):
        logger.debug("Project not found: %s", project_id)
        return None
    with open(path, "r") as f:
        return json.load(f)


def update_project(project_id: str, data: dict):
    project = get_project(project_id)
    if project is None:
        logger.warning("Cannot update non-existent project: %s", project_id)
        return
    _deep_update(project, data)
    _save_project(project_id, project)
    updated_keys = list(data.keys())
    logger.debug("[%s] Project updated: %s", project_id[:8], updated_keys)


def upload_file(file_bytes: bytes, destination: str, content_type: str = "application/octet-stream") -> str:
    full_path = os.path.join(DATA_DIR, destination)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "wb") as f:
        f.write(file_bytes)
    url = f"{STORAGE_BASE_URL}/files/{destination}"
    logger.info("File saved: %s (%d bytes, %s)", destination, len(file_bytes), content_type)
    return url


def resolve_image_path(image_url: str | None) -> str | None:
    """Convert a storage URL back to a local file path, or None if not found."""
    if not image_url:
        return None
    prefix = "/files/"
    idx = image_url.find(prefix)
    if idx == -1:
        return None
    relative = image_url[idx + len(prefix):]
    full_path = os.path.join(DATA_DIR, relative)
    return full_path if os.path.exists(full_path) else None


def download_file(source: str) -> bytes:
    full_path = os.path.join(DATA_DIR, source)
    if not os.path.exists(full_path):
        logger.error("File not found for download: %s", source)
        raise FileNotFoundError(f"File not found: {source}")
    with open(full_path, "rb") as f:
        data = f.read()
    logger.debug("File downloaded: %s (%d bytes)", source, len(data))
    return data
