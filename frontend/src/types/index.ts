export interface Character {
  id: string;
  name: string;
  age: number;
  role: string;
  appearance: string;
  personality: string;
  scenes: string[];
  imageUrl: string | null;
  imageDescription: string | null;
}

export interface Prop {
  id: string;
  name: string;
  category: string;
  description: string;
  scenes: string[];
  imageUrl: string | null;
}

export interface Costume {
  id: string;
  name: string;
  characterId: string;
  description: string;
  materials: string[];
  scenes: string[];
  imageUrl: string | null;
}

export interface SceneEdits {
  brightness: number;
  aiBlend: number;
  blurDepth: number;
  colorGrade: string | null;
  backgroundShift: string | null;
}

export interface Scene {
  id: string;
  number: number;
  title: string;
  location: string;
  mood: string;
  timeOfDay: string;
  characters: string[];
  props: string[];
  costumes: string[];
  actions: string;
  dialogue: string[];
  cameraNote: string;
  lightingStyle: string;
  visualStyle: string;
  previousSceneContext: string | null;
  nextSceneContext: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  estimatedDuration: number | null;
  duration: number | null;
  status: "pending" | "generating" | "generated" | "approved";
  edits: SceneEdits;
}

export interface ScriptData {
  rawText: string;
  characters: Character[];
  props: Prop[];
  costumes: Costume[];
  scenes: Scene[];
}

export type ProjectStatus =
  | "uploaded"
  | "analyzing"
  | "analyzed"
  | "assets_generating"
  | "assets_ready"
  | "scenes_generating"
  | "scenes_ready"
  | "assembling"
  | "ready";

export type ContinuityStatus = "no_issues" | "warning" | "critical" | "error" | "pending";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ContinuityIssue {
  id: string;
  type: "prop" | "lighting" | "actor" | "costume" | "environment";
  severity: "warning" | "critical";
  title: string;
  description: string;
  timestamp: string;
  autoFixAvailable: boolean;
  boundingBox: BoundingBox | null;
}

export interface SceneContinuity {
  sceneId: string;
  status: ContinuityStatus;
  score: number;
  issues: ContinuityIssue[];
  comparedWith: string | null;
  summary: string;
}

export type ContinuityAnalysisStatus = "idle" | "analyzing" | "ready" | "error";

export interface Project {
  projectId: string;
  title: string;
  status: ProjectStatus;
  scriptData: ScriptData | null;
  createdAt: string;
  exportVideoUrl: string | null;
  continuityStatus?: ContinuityAnalysisStatus;
  continuityData?: SceneContinuity[];
}
