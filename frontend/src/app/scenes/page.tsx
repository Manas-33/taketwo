"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/hooks/useProject";
import { uploadSceneFootage, removeSceneFootage } from "@/lib/api";
import SceneCard from "@/components/scenes/SceneCard";
import {
  Loader2,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Film,
} from "lucide-react";
import type { Scene } from "@/types";

const SCENES_PER_PAGE = 6;

export default function ScenesPage() {
  const { project, projectId, refresh } = useProject();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [generating, setGenerating] = useState(false);

  const scenes: Scene[] = project?.scriptData?.scenes ?? [];
  const totalPages = Math.ceil(scenes.length / SCENES_PER_PAGE);
  const pagedScenes = scenes.slice(
    (page - 1) * SCENES_PER_PAGE,
    page * SCENES_PER_PAGE,
  );

  const isGenerating = project?.status === "scenes_generating" || generating;
  const allHaveVideos = scenes.length > 0 && scenes.every((s) => s.videoUrl);
  const someHaveVideos = scenes.some((s) => s.videoUrl);
  const remainingCount = scenes.filter((s) => !s.videoUrl).length;

  const handleUpload = useCallback(
    async (sceneId: string, file: File) => {
      if (!projectId) return;
      await uploadSceneFootage(projectId, sceneId, file);
      await refresh();
    },
    [projectId, refresh],
  );

  const handleRemove = useCallback(
    async (sceneId: string) => {
      if (!projectId) return;
      await removeSceneFootage(projectId, sceneId);
      await refresh();
    },
    [projectId, refresh],
  );

  const handleGenerate = async () => {
    if (!projectId) return;
    setGenerating(true);
    try {
      const API_BASE =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      await fetch(`${API_BASE}/api/scenes/generate/${projectId}`, {
        method: "POST",
      });
    } catch {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (project?.status === "scenes_ready") {
      setGenerating(false);
    }
  }, [project?.status]);

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
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-stone-900">
            Scene Gallery
          </h1>
          <p className="mt-2 max-w-md text-sm text-stone-500">
            Upload your own raw footage for each scene, or let Veo AI generate
            cinematic sequences from your script. Mix and match as you like.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!allHaveVideos && !isGenerating && scenes.length > 0 && (
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
            >
              <Sparkles size={16} /> Generate Remaining
            </button>
          )}
          {allHaveVideos && (
            <button
              onClick={() => router.push("/continuity")}
              className="flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
            >
              <ArrowRight size={16} /> Continue to Review
            </button>
          )}
        </div>
      </div>

      {/* Generating Banner */}
      {isGenerating && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <Loader2 size={20} className="animate-spin text-orange-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-800">
              Generating scene videos with Veo AI...
            </p>
            <p className="mt-0.5 text-xs text-orange-600/70">
              {scenes.filter((s) => s.videoUrl).length} of {scenes.length}{" "}
              complete — videos appear as they&apos;re ready
            </p>
          </div>
        </div>
      )}

      {/* Scene Grid */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {pagedScenes.map((scene) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            projectId={projectId}
            onUpload={handleUpload}
            onRemove={handleRemove}
            generating={isGenerating && !scene.videoUrl}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex flex-col items-center gap-4">
          <p className="text-sm text-stone-400">
            Page {page} of {totalPages} &bull; Showing {pagedScenes.length} of{" "}
            {scenes.length} Scenes
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 text-stone-500 hover:bg-stone-50 disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium ${
                  p === page
                    ? "bg-orange-600 text-white"
                    : "border border-stone-300 text-stone-600 hover:bg-stone-50"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-300 text-stone-500 hover:bg-stone-50 disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Insight Bar */}
      {scenes.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-xl border border-stone-100 bg-white px-5 py-3 shadow-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
              <Film size={16} className="text-orange-600" />
            </div>
            <p className="text-sm text-stone-600">
              <span className="font-bold text-orange-600">SCENES</span>{" "}
              {allHaveVideos
                ? "All scenes have footage. Proceed to continuity review."
                : someHaveVideos
                  ? `${remainingCount} scene${remainingCount > 1 ? "s" : ""} remaining — upload your own footage or generate with AI.`
                  : `${scenes.length} scenes detected. Upload raw footage or generate with AI.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
