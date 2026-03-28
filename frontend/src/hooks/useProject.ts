"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Project } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ACTIVE_STATUSES = new Set([
  "analyzing",
  "assets_generating",
  "scenes_generating",
  "assembling",
]);

export function useProject() {
  const [project, setProject] = useState<Project | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("filmai_project_id");
    if (stored) {
      setProjectId(stored);
    }
  }, []);

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`${API_BASE}/api/script/project/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      }
    } catch {
      // Network error, will retry on next poll
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetchProject();

    const isActive = project?.status && ACTIVE_STATUSES.has(project.status);
    const interval = isActive ? 1500 : 3000;

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchProject, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [projectId, project?.status, fetchProject]);

  const refresh = useCallback(() => {
    return fetchProject();
  }, [fetchProject]);

  const setActiveProject = useCallback((id: string) => {
    localStorage.setItem("filmai_project_id", id);
    setProjectId(id);
  }, []);

  return { project, projectId, loading, setActiveProject, refresh };
}
