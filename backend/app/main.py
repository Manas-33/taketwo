import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import script, assets, scenes, continuity, export, test

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

app = FastAPI(title="FilmAI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(script.router, prefix="/api/script", tags=["Script"])
app.include_router(assets.router, prefix="/api/assets", tags=["Assets"])
app.include_router(scenes.router, prefix="/api/scenes", tags=["Scenes"])
app.include_router(continuity.router, prefix="/api/continuity", tags=["Continuity"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])
app.include_router(test.router, prefix="/api/test", tags=["Test"])

data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(data_dir, exist_ok=True)
app.mount("/files", StaticFiles(directory=data_dir), name="files")

logger = logging.getLogger("filmai")


@app.get("/")
async def root():
    return {"message": "FilmAI API is running"}
