"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/hooks/useProject";
import { analyzeContinuity } from "@/lib/api";
import {
  Play,
  ChevronLeft,
  ChevronRight,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ScanSearch,
} from "lucide-react";
import type { Scene, ContinuityStatus, SceneContinuity } from "@/types";

const SCENES_PER_PAGE = 6;

const STATUS_CONFIG: Record<
  ContinuityStatus,
  { label: string; icon: typeof CheckCircle2; bg: string; text: string }
> = {
  no_issues: {
    label: "NO ISSUES",
    icon: CheckCircle2,
    bg: "bg-emerald-100",
    text: "text-emerald-700",
  },
  warning: {
    label: "WARNING",
    icon: AlertTriangle,
    bg: "bg-amber-100",
    text: "text-amber-700",
  },
  critical: {
    label: "CONTINUITY ISSUES",
    icon: XCircle,
    bg: "bg-red-100",
    text: "text-red-700",
  },
  error: {
    label: "ERROR",
    icon: XCircle,
    bg: "bg-stone-100",
    text: "text-stone-500",
  },
  pending: {
    label: "PENDING",
    icon: Loader2,
    bg: "bg-stone-100",
    text: "text-stone-500",
  },
};

export default function ContinuityPage() {
  const { project, projectId } = useProject();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [launching, setLaunching] = useState(false);

  const scenes: Scene[] = project?.scriptData?.scenes ?? [];
  const scenesWithVideo = scenes.filter((s) => s.videoUrl);
  const totalPages = Math.ceil(scenesWithVideo.length / SCENES_PER_PAGE);
  const pagedScenes = scenesWithVideo.slice(
    (page - 1) * SCENES_PER_PAGE,
    page * SCENES_PER_PAGE,
  );

  const continuityStatus = project?.continuityStatus ?? "idle";
  const continuityData: SceneContinuity[] = project?.continuityData ?? [];
  const isAnalyzing = continuityStatus === "analyzing" || launching;
  const hasResults = continuityData.length > 0;

  const getContinuityForScene = (sceneId: string): SceneContinuity | null =>
    continuityData.find((c) => c.sceneId === sceneId) ?? null;

  const totalIssues = continuityData.reduce((sum, c) => sum + c.issues.length, 0);
  const avgScore =
    continuityData.length > 0
      ? Math.round(
          continuityData.reduce((sum, c) => sum + c.score, 0) /
            continuityData.length,
        )
      : 0;

  const handleAnalyze = useCallback(async () => {
    if (!projectId || isAnalyzing) return;
    setLaunching(true);
    try {
      await analyzeContinuity(projectId);
    } catch {
      setLaunching(false);
    }
  }, [projectId, isAnalyzing]);

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

  if (scenesWithVideo.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-stone-300" />
          <p className="mt-4 text-lg text-stone-500">
            No scenes with video to review.
          </p>
          <button
            onClick={() => router.push("/scenes")}
            className="mt-4 text-orange-600 hover:underline"
          >
            Generate scene videos first
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
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">
            STEP 04 &middot; AI Continuity Engine
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-stone-900">
            Continuity Review
          </h1>
          <p className="mt-2 max-w-lg text-sm text-stone-500">
            AI-powered analysis of scene-to-scene consistency. Detect prop
            mismatches, lighting shifts, and actor position anomalies before
            final export.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {hasResults && (
            <>
              <div className="flex flex-col items-center rounded-xl border border-stone-200 bg-white px-5 py-3">
                <span className="text-2xl font-bold text-stone-900">
                  {avgScore}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wide text-stone-400">
                  Avg Score
                </span>
              </div>
              <div className="flex flex-col items-center rounded-xl border border-stone-200 bg-white px-5 py-3">
                <span className="text-2xl font-bold text-orange-600">
                  {totalIssues}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wide text-stone-400">
                  Issues
                </span>
              </div>
            </>
          )}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
          >
            {isAnalyzing ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <ScanSearch size={16} />{" "}
                {hasResults ? "Re-analyze" : "Run Analysis"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Analyzing Banner */}
      {isAnalyzing && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <Loader2 size={20} className="animate-spin text-orange-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-800">
              Analyzing scene continuity with Gemini AI...
            </p>
            <p className="mt-0.5 text-xs text-orange-600/70">
              {continuityData.length} of {scenesWithVideo.length} scenes
              analyzed — results appear as they&apos;re ready
            </p>
          </div>
        </div>
      )}

      {/* Scene Grid */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {pagedScenes.map((scene) => {
          const continuity = getContinuityForScene(scene.id);
          const statusKey = continuity?.status ?? "pending";
          const status =
            STATUS_CONFIG[statusKey as ContinuityStatus] ??
            STATUS_CONFIG.pending;
          const StatusIcon = status.icon;

          return (
            <button
              key={scene.id}
              onClick={() =>
                router.push(
                  `/continuity/${scene.id}?project=${projectId}`,
                )
              }
              className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white text-left transition-shadow hover:shadow-lg"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video w-full overflow-hidden bg-stone-900">
                {scene.videoUrl ? (
                  <>
                    <video
                      src={scene.videoUrl}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      muted
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-600 text-white shadow-lg">
                        <Play size={24} fill="white" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-600/80 text-white">
                      <Play size={24} fill="white" />
                    </div>
                  </div>
                )}

                {/* Status Badge */}
                {continuity && (
                  <div
                    className={`absolute top-3 right-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${status.bg} ${status.text}`}
                  >
                    <StatusIcon size={12} />
                    {status.label}
                  </div>
                )}

                {/* Scene Label */}
                <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  SCENE {String(scene.number).padStart(2, "0")}
                </span>
              </div>

              {/* Info */}
              <div className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900">
                    Scene {String(scene.number).padStart(2, "0")}:{" "}
                    {scene.title}
                  </h3>
                  {continuity && (
                    <span className="text-xs text-stone-400">
                      {continuity.score}/100
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 text-xs text-stone-500">
                  {continuity
                    ? continuity.summary ||
                      (continuity.issues.length === 0
                        ? "No continuity issues detected."
                        : `${continuity.issues.length} issue${continuity.issues.length > 1 ? "s" : ""} detected — click to review.`)
                    : "Not yet analyzed. Run analysis to check continuity."}
                </p>

                {/* Issue Pills */}
                {continuity && continuity.issues.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {continuity.issues.slice(0, 3).map((issue) => (
                      <span
                        key={issue.id}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          issue.severity === "critical"
                            ? "bg-red-50 text-red-600"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {issue.title.split(":")[0]}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                  <div className="flex items-center gap-1.5 text-xs text-stone-500">
                    <Shield size={12} className="text-orange-600" />
                    <span className="uppercase">
                      {continuity ? `SCORE ${continuity.score}` : "PENDING"}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-orange-600 group-hover:underline">
                    REVIEW →
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex flex-col items-center gap-4">
          <p className="text-sm text-stone-400">
            Page {page} of {totalPages} &bull; Showing {pagedScenes.length} of{" "}
            {scenesWithVideo.length} Scenes
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
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-3 rounded-xl border border-stone-100 bg-white px-5 py-3 shadow-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
            <Shield size={16} className="text-orange-600" />
          </div>
          <p className="text-sm text-stone-600">
            <span className="font-bold text-orange-600">CONTINUITY</span>{" "}
            {!hasResults
              ? `${scenesWithVideo.length} scenes ready. Run analysis to check continuity.`
              : totalIssues === 0
                ? "All scenes pass continuity checks."
                : `${totalIssues} issue${totalIssues > 1 ? "s" : ""} found across ${continuityData.filter((c) => c.issues.length > 0).length} scene${continuityData.filter((c) => c.issues.length > 0).length > 1 ? "s" : ""}. Review and apply fixes.`}
          </p>
        </div>
      </div>
    </div>
  );
}
