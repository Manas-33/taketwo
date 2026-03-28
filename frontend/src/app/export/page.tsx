"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/hooks/useProject";
import FinalPlayer from "@/components/export/FinalPlayer";
import ProjectTimeline from "@/components/export/ProjectTimeline";
import { Loader2, Upload, Download } from "lucide-react";

export default function ExportPage() {
  const { project, projectId } = useProject();
  const router = useRouter();
  const [assembling, setAssembling] = useState(false);

  const scenes = project?.scriptData?.scenes ?? [];
  const isAssembling = project?.status === "assembling" || assembling;

  const handleAssemble = async () => {
    if (!projectId) return;
    setAssembling(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      await fetch(`${API_BASE}/api/export/assemble/${projectId}`, {
        method: "POST",
      });
    } catch {
      setAssembling(false);
    }
  };

  useEffect(() => {
    if (project?.status === "ready") {
      setAssembling(false);
    }
  }, [project?.status]);

  const handleExport = () => {
    if (project?.exportVideoUrl) {
      window.open(project.exportVideoUrl, "_blank");
    }
  };

  if (!projectId) {
    return (
      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-stone-500">No project loaded.</p>
          <button
            onClick={() => router.push("/script")}
            className="mt-4 text-orange-600 hover:underline"
          >
            Upload a script first
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-stone-900">
            Final Assembly
          </h1>
          <p className="mt-2 max-w-lg text-sm text-stone-500">
            Review your cinematic masterpiece. All scenes have been merged with
            AI-enhanced transitions and color grading.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!project?.exportVideoUrl && !isAssembling && scenes.some((s) => s.videoUrl) && (
            <button
              onClick={handleAssemble}
              className="flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-700"
            >
              <Loader2 size={16} className={assembling ? "animate-spin" : "hidden"} />
              Assemble Video
            </button>
          )}
          {project?.exportVideoUrl && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-700"
            >
              <Upload size={16} /> Export Final Video
            </button>
          )}
        </div>
      </div>

      {isAssembling && (
        <div className="mt-6 flex items-center gap-3 rounded-xl bg-orange-50 border border-orange-200 p-4">
          <Loader2 size={20} className="animate-spin text-orange-600" />
          <p className="text-sm font-medium text-orange-800">
            Assembling final video... Merging scenes with transitions.
          </p>
        </div>
      )}

      {/* Video Player */}
      <div className="mt-8">
        <FinalPlayer
          videoUrl={project?.exportVideoUrl || null}
          status={project?.status || ""}
        />
      </div>

      {/* Timeline */}
      <ProjectTimeline scenes={scenes} />
    </div>
  );
}
