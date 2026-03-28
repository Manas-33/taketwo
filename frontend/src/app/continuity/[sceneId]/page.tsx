"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { getContinuity } from "@/lib/api";
import {
  ArrowLeft,
  AlertTriangle,
  MapPin,
  Lightbulb,
  Package,
  Shirt,
  Trees,
  Wand2,
  ChevronRight,
  Loader2,
} from "lucide-react";
import type { Project, Scene, SceneContinuity, ContinuityIssue } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ISSUE_ICON: Record<ContinuityIssue["type"], typeof Package> = {
  prop: Package,
  lighting: Lightbulb,
  actor: MapPin,
  costume: Shirt,
  environment: Trees,
};

const ISSUE_COLOR: Record<
  ContinuityIssue["severity"],
  { dot: string; bg: string }
> = {
  critical: { dot: "bg-red-500", bg: "border-red-100" },
  warning: { dot: "bg-amber-500", bg: "border-amber-100" },
};

export default function ContinuityDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sceneId = params.sceneId as string;
  const projectId =
    searchParams.get("project") ||
    (typeof window !== "undefined"
      ? localStorage.getItem("filmai_project_id")
      : "") ||
    "";

  const [project, setProject] = useState<Project | null>(null);
  const [continuity, setContinuity] = useState<SceneContinuity | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!projectId) return;

    const fetchData = async () => {
      try {
        const [projRes, contRes] = await Promise.all([
          fetch(`${API_BASE}/api/script/project/${projectId}`).then((r) =>
            r.ok ? r.json() : null,
          ),
          getContinuity(projectId),
        ]);
        if (projRes) setProject(projRes);
        if (contRes?.data) {
          const match = contRes.data.find(
            (c: SceneContinuity) => c.sceneId === sceneId,
          );
          if (match) setContinuity(match);
        }
      } catch {
        /* retry on next poll */
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [projectId, sceneId]);

  const scene: Scene | undefined = project?.scriptData?.scenes?.find(
    (s) => s.id === sceneId,
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => setCurrentTime(video.currentTime);
    const onLoaded = () => setDuration(video.duration);
    const onEnded = () => setPlaying(false);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("ended", onEnded);
    };
  }, [scene?.videoUrl]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause();
    else videoRef.current.play();
    setPlaying(!playing);
  };

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = ratio * duration;
  };

  if (!projectId || !scene) {
    return (
      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-stone-500">Scene not found.</p>
          <button
            onClick={() => router.push("/continuity")}
            className="mt-4 text-orange-600 hover:underline"
          >
            Back to Continuity Review
          </button>
        </div>
      </div>
    );
  }

  const scoreColor =
    !continuity
      ? "text-stone-400"
      : continuity.score >= 90
        ? "text-emerald-600"
        : continuity.score >= 70
          ? "text-amber-600"
          : "text-red-600";

  const scoreBarColor =
    !continuity
      ? "bg-stone-300"
      : continuity.score >= 90
        ? "bg-emerald-500"
        : continuity.score >= 70
          ? "bg-amber-500"
          : "bg-red-500";

  return (
    <div className="flex h-[calc(100vh-73px)]">
      {/* Center Content */}
      <div className="flex flex-1 flex-col overflow-y-auto px-8 py-6">
        {/* Back Button + Title */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.push("/continuity")}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-600 transition-colors hover:bg-stone-50"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-stone-900">
              Scene {String(scene.number).padStart(2, "0")}: {scene.title}
            </h1>
            <p className="text-xs text-stone-400">
              {continuity?.comparedWith
                ? `Compared with ${continuity.comparedWith}`
                : "Standalone analysis"}{" "}
              &bull; AI Continuity Scan
            </p>
          </div>
        </div>

        {/* Video Player */}
        <div className="relative overflow-hidden rounded-xl bg-stone-900">
          {scene.videoUrl ? (
            <video
              ref={videoRef}
              src={scene.videoUrl}
              className="aspect-video w-full object-contain"
              preload="metadata"
              onClick={togglePlay}
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center">
              <p className="text-sm text-stone-500">No video available</p>
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-white">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <div
                className="relative flex-1 cursor-pointer"
                onClick={handleSeek}
              >
                <div className="h-1 w-full rounded-full bg-white/30">
                  <div
                    className="h-full rounded-full bg-orange-600 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Play button */}
          {!playing && scene.videoUrl && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-600/90 text-white shadow-lg transition-transform hover:scale-110">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="white"
                >
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Right Sidebar — Continuity Report */}
      <aside className="w-[340px] overflow-y-auto border-l border-stone-200 bg-white px-5 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              Continuity Report
            </h2>
            <p className="text-[11px] text-stone-400">
              AI-Detected Anomalies &bull; Gemini 2.5 Flash
            </p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
            <AlertTriangle size={16} className="text-orange-600" />
          </div>
        </div>

        {/* Loading State */}
        {!continuity && (
          <div className="mt-8 flex flex-col items-center gap-3 py-12">
            <Loader2
              size={28}
              className="animate-spin text-stone-300"
            />
            <p className="text-sm text-stone-400">
              Waiting for analysis results...
            </p>
            <p className="text-xs text-stone-300">
              Run analysis from the Continuity Review page.
            </p>
          </div>
        )}

        {/* Issues */}
        {continuity && (
          <div className="mt-6 flex flex-col gap-4">
            {continuity.issues.length === 0 ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                <p className="text-sm font-medium text-emerald-700">
                  No issues detected
                </p>
                <p className="mt-1 text-xs text-emerald-500">
                  This scene passes all continuity checks.
                </p>
              </div>
            ) : (
              continuity.issues.map((issue) => {
                const Icon =
                  ISSUE_ICON[issue.type as ContinuityIssue["type"]] ?? Package;
                const color =
                  ISSUE_COLOR[
                    issue.severity as ContinuityIssue["severity"]
                  ] ?? ISSUE_COLOR.warning;

                return (
                  <div
                    key={issue.id}
                    className={`rounded-xl border ${color.bg} bg-white p-4`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          issue.severity === "critical"
                            ? "bg-red-100"
                            : "bg-amber-100"
                        }`}
                      >
                        <Icon
                          size={14}
                          className={
                            issue.severity === "critical"
                              ? "text-red-600"
                              : "text-amber-600"
                          }
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-stone-900">
                            {issue.title}
                          </h4>
                          <span className="text-xs text-stone-400">
                            {issue.timestamp}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-stone-500">
                          {issue.description}
                        </p>
                        {issue.autoFixAvailable && (
                          <p className="mt-2 text-[11px] text-stone-400">
                            Auto-fix available via AI
                          </p>
                        )}
                        <button className="mt-2 flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700">
                          Review <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Continuity Score */}
        {continuity && (
          <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Continuity Score
            </p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className={`text-4xl font-bold ${scoreColor}`}>
                {continuity.score}
              </span>
              <span className="text-sm text-stone-400">/ 100</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-200">
              <div
                className={`h-full rounded-full ${scoreBarColor} transition-all`}
                style={{ width: `${continuity.score}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-stone-500">
              {continuity.summary ||
                (continuity.issues.length === 0
                  ? "All checks passed. Scene is ready for export."
                  : `${continuity.issues.filter((i) => i.severity === "critical").length} critical issue${continuity.issues.filter((i) => i.severity === "critical").length !== 1 ? "s" : ""} remaining.`)}
            </p>
          </div>
        )}

        {/* Apply Auto-Corrections */}
        {continuity?.issues.some((i) => i.autoFixAvailable) && (
          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800">
            <Wand2 size={16} /> Apply Auto-Corrections
          </button>
        )}
      </aside>
    </div>
  );
}
