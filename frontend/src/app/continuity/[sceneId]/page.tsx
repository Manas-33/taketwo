"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { getContinuity, correctContinuityIssues } from "@/lib/api";
import {
  ArrowLeft,
  AlertTriangle,
  MapPin,
  Lightbulb,
  Package,
  Shirt,
  Trees,
  Wand2,
  Loader2,
  CheckCircle2,
  Crosshair,
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
  const [correcting, setCorrecting] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

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
            (c) => c.sceneId === sceneId,
          ) as SceneContinuity | undefined;
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

  const parseTimestamp = (ts: string): number => {
    const parts = ts.split(":").map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      setSelectedIssueId(null);
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  const handleIssueClick = (issue: ContinuityIssue) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    videoRef.current.currentTime = parseTimestamp(issue.timestamp);
    setPlaying(false);
    setSelectedIssueId(issue.id === selectedIssueId ? null : issue.id);
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

  const handleCorrectAll = useCallback(async () => {
    if (!projectId || correcting) return;
    setCorrecting(true);
    try {
      await correctContinuityIssues(projectId, sceneId);
    } catch {
      setCorrecting(false);
    }
  }, [projectId, sceneId, correcting]);

  const isSceneRegenerating = scene?.status === "generating";

  useEffect(() => {
    if (scene && scene.status !== "generating") {
      setCorrecting(false);
    }
  }, [scene?.status]);

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

          {/* Bounding box overlay */}
          {selectedIssueId && (() => {
            const issue = continuity?.issues.find((i) => i.id === selectedIssueId);
            if (!issue?.boundingBox) return null;
            const { x, y, width, height } = issue.boundingBox;
            const borderColor = issue.severity === "critical" ? "rgba(239,68,68,0.9)" : "rgba(245,158,11,0.9)";
            const bgColor = issue.severity === "critical" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)";
            return (
              <div
                className="pointer-events-none absolute"
                style={{
                  left: `${x * 100}%`,
                  top: `${y * 100}%`,
                  width: `${width * 100}%`,
                  height: `${height * 100}%`,
                  border: `2px solid ${borderColor}`,
                  backgroundColor: bgColor,
                  borderRadius: "4px",
                  boxShadow: `0 0 0 1px rgba(0,0,0,0.3), 0 0 12px ${borderColor}`,
                  transition: "all 0.2s ease-out",
                }}
              >
                <span
                  className="absolute -top-6 left-0 max-w-[200px] truncate rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                  style={{ backgroundColor: borderColor }}
                >
                  {issue.title}
                </span>
              </div>
            );
          })()}

          {/* Play button */}
          {!playing && scene.videoUrl && !selectedIssueId && (
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
                const isSelected = selectedIssueId === issue.id;

                return (
                  <div
                    key={issue.id}
                    onClick={() => handleIssueClick(issue)}
                    className={`cursor-pointer rounded-xl border transition-all ${
                      isSelected
                        ? "border-orange-400 bg-orange-50 ring-2 ring-orange-200"
                        : `${color.bg} bg-white hover:bg-stone-50`
                    } p-4`}
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
                          <div className="flex items-center gap-1.5">
                            {issue.boundingBox && (
                              <Crosshair size={12} className="text-orange-500" />
                            )}
                            <span className="text-xs text-stone-400">
                              {issue.timestamp}
                            </span>
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-stone-500">
                          {issue.description}
                        </p>
                        {(issue as unknown as { status?: string }).status === "corrected" && (
                          <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                            <CheckCircle2 size={12} /> Correction applied
                          </p>
                        )}
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

        {/* Correcting Banner */}
        {(correcting || isSceneRegenerating) && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3">
            <Loader2 size={16} className="animate-spin text-orange-600" />
            <p className="text-xs font-medium text-orange-800">
              Regenerating scene with corrections...
            </p>
          </div>
        )}

        {/* Apply All Corrections */}
        {continuity && continuity.issues.length > 0 && (
          <button
            onClick={handleCorrectAll}
            disabled={correcting || isSceneRegenerating}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {correcting || isSceneRegenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Correcting...
              </>
            ) : (
              <>
                <Wand2 size={16} /> Fix All Issues ({continuity.issues.length})
              </>
            )}
          </button>
        )}
      </aside>
    </div>
  );
}
