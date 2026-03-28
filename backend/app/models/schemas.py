from pydantic import BaseModel
from typing import Optional
from enum import Enum


class ProjectStatus(str, Enum):
    UPLOADED = "uploaded"
    ANALYZING = "analyzing"
    ANALYZED = "analyzed"
    ASSETS_GENERATING = "assets_generating"
    ASSETS_READY = "assets_ready"
    SCENES_GENERATING = "scenes_generating"
    SCENES_READY = "scenes_ready"
    ASSEMBLING = "assembling"
    READY = "ready"


class Character(BaseModel):
    id: str
    name: str
    age: int
    role: str
    appearance: str
    personality: str
    scenes: list[str]
    imageUrl: Optional[str] = None
    imageDescription: Optional[str] = None


class Prop(BaseModel):
    id: str
    name: str
    category: str
    description: str
    scenes: list[str]
    imageUrl: Optional[str] = None


class Costume(BaseModel):
    id: str
    name: str
    characterId: str
    description: str
    materials: list[str]
    scenes: list[str]
    imageUrl: Optional[str] = None


class SceneEdits(BaseModel):
    brightness: float = 100
    aiBlend: float = 50
    blurDepth: float = 0
    colorGrade: Optional[str] = None
    backgroundShift: Optional[str] = None


class Scene(BaseModel):
    id: str
    number: int
    title: str
    location: str
    mood: str
    timeOfDay: str
    characters: list[str]
    props: list[str]
    costumes: list[str]
    actions: str
    dialogue: list[str] = []
    cameraNote: str = ""
    previousSceneContext: Optional[str] = None
    nextSceneContext: Optional[str] = None
    videoUrl: Optional[str] = None
    thumbnailUrl: Optional[str] = None
    estimatedDuration: Optional[float] = None
    duration: Optional[float] = None
    status: str = "pending"
    edits: SceneEdits = SceneEdits()


class ScriptData(BaseModel):
    rawText: str = ""
    characters: list[Character] = []
    props: list[Prop] = []
    costumes: list[Costume] = []
    scenes: list[Scene] = []


class Project(BaseModel):
    projectId: str
    title: str
    status: ProjectStatus = ProjectStatus.UPLOADED
    scriptData: Optional[ScriptData] = None
    createdAt: str = ""
    exportVideoUrl: Optional[str] = None


class EditRequest(BaseModel):
    instruction: str


class TransformRequest(BaseModel):
    brightness: Optional[float] = None
    aiBlend: Optional[float] = None
    blurDepth: Optional[float] = None
    colorGrade: Optional[str] = None
    backgroundShift: Optional[str] = None


class ContinuityIssue(BaseModel):
    id: str = ""
    type: str
    severity: str
    title: str
    description: str
    timestamp: str
    autoFixAvailable: bool = False


class SceneContinuity(BaseModel):
    sceneId: str
    status: str = "pending"
    score: int = 0
    issues: list[ContinuityIssue] = []
    comparedWith: Optional[str] = None
    summary: str = ""
