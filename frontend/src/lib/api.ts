import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
});

export async function uploadScript(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/api/script/upload", formData);
  return res.data;
}

export async function analyzeScript(projectId: string) {
  const res = await api.post(`/api/script/analyze/${projectId}`);
  return res.data;
}

export async function getProject(projectId: string) {
  const res = await api.get(`/api/script/project/${projectId}`);
  return res.data;
}

export async function generateAssets(projectId: string) {
  const res = await api.post(`/api/assets/generate/${projectId}`);
  return res.data;
}

export async function generateScenes(projectId: string) {
  const res = await api.post(`/api/scenes/generate/${projectId}`);
  return res.data;
}

export async function regenerateScene(sceneId: string, projectId: string) {
  const res = await api.post(`/api/scenes/${sceneId}/regenerate`, null, {
    params: { project_id: projectId },
  });
  return res.data;
}

export async function editScene(sceneId: string, projectId: string, instruction: string) {
  const res = await api.post(`/api/scenes/${sceneId}/edit`, { instruction }, {
    params: { project_id: projectId },
  });
  return res.data;
}

export async function transformScene(
  sceneId: string,
  projectId: string,
  transforms: {
    brightness?: number;
    aiBlend?: number;
    blurDepth?: number;
    colorGrade?: string;
    backgroundShift?: string;
  }
) {
  const res = await api.post(`/api/scenes/${sceneId}/transform`, transforms, {
    params: { project_id: projectId },
  });
  return res.data;
}

export async function assembleExport(projectId: string) {
  const res = await api.post(`/api/export/assemble/${projectId}`);
  return res.data;
}

export async function getExportStatus(projectId: string) {
  const res = await api.get(`/api/export/status/${projectId}`);
  return res.data;
}

export async function uploadAsset(
  projectId: string,
  assetType: "characters" | "props" | "costumes",
  assetId: string,
  file: File,
): Promise<{ status: string; imageUrl: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(`/api/assets/${projectId}/upload/${assetType}/${assetId}`, formData);
  return res.data;
}

export async function removeAssetImage(
  projectId: string,
  assetType: "characters" | "props" | "costumes",
  assetId: string,
): Promise<{ status: string }> {
  const res = await api.delete(`/api/assets/${projectId}/${assetType}/${assetId}/image`);
  return res.data;
}

export async function deleteAsset(
  projectId: string,
  assetType: "characters" | "props" | "costumes",
  assetId: string,
): Promise<{ status: string }> {
  const res = await api.delete(`/api/assets/${projectId}/${assetType}/${assetId}`);
  return res.data;
}

export async function uploadSceneFootage(
  projectId: string,
  sceneId: string,
  file: File,
): Promise<{ status: string; videoUrl: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post(`/api/scenes/${sceneId}/upload-footage`, formData, {
    params: { project_id: projectId },
  });
  return res.data;
}

export async function removeSceneFootage(
  projectId: string,
  sceneId: string,
): Promise<{ status: string }> {
  const res = await api.delete(`/api/scenes/${sceneId}/footage`, {
    params: { project_id: projectId },
  });
  return res.data;
}

export async function analyzeContinuity(projectId: string) {
  const res = await api.post(`/api/continuity/analyze/${projectId}`);
  return res.data;
}

export async function getContinuity(projectId: string): Promise<{
  status: string;
  data: Array<{
    sceneId: string;
    status: string;
    score: number;
    issues: Array<{
      id: string;
      type: string;
      severity: string;
      title: string;
      description: string;
      timestamp: string;
      autoFixAvailable: boolean;
    }>;
    comparedWith: string | null;
    summary: string;
  }>;
}> {
  const res = await api.get(`/api/continuity/${projectId}`);
  return res.data;
}

export async function correctContinuityIssues(
  projectId: string,
  sceneId: string,
  issueIds?: string[],
): Promise<{ status: string; message: string; issueCount: number }> {
  const res = await api.post(`/api/continuity/${projectId}/correct/${sceneId}`, {
    issue_ids: issueIds ?? null,
  });
  return res.data;
}

export async function testVeo(): Promise<{ status: string; videoUrl?: string; message?: string }> {
  const res = await api.post("/api/test/veo");
  return res.data;
}

export default api;
