"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Play,
  Loader2,
  Sparkles,
  Edit3,
  Camera,
  Upload,
  RefreshCw,
  Trash2,
  Film,
} from "lucide-react";
import type { Scene } from "@/types";

interface SceneCardProps {
  scene: Scene;
  projectId: string;
  onUpload?: (sceneId: string, file: File) => Promise<void>;
  onRemove?: (sceneId: string) => Promise<void>;
  generating?: boolean;
}

export default function SceneCard({
  scene,
  projectId,
  onUpload,
  onRemove,
  generating,
}: SceneCardProps) {
  const [prompt, setPrompt] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isGenerating = scene.status === "generating" || (generating && !scene.videoUrl);
  const hasVideo = !!scene.videoUrl;

  const formatDuration = (d: number | null) => {
    if (!d) return "0:00";
    const mins = Math.floor(d / 60);
    const secs = Math.floor(d % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const processFile = useCallback(
    async (file: File) => {
      if (!onUpload || !file.type.startsWith("video/")) return;
      setUploading(true);
      try {
        await onUpload(scene.id, file);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [onUpload, scene.id],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleQuickEdit = async () => {
    if (!prompt.trim()) return;
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    await fetch(
      `${API_BASE}/api/scenes/${scene.id}/edit?project_id=${projectId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: prompt }),
      },
    );
    setPrompt("");
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white transition-shadow hover:shadow-lg">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) processFile(f);
        }}
      />

      {/* Video Thumbnail Area */}
      <div
        className={`relative aspect-video w-full overflow-hidden bg-stone-900 transition-all ${
          dragOver ? "ring-2 ring-inset ring-orange-400" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          if (onUpload) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {hasVideo ? (
          <>
            <video
              key={scene.videoUrl}
              src={scene.videoUrl!}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              muted
              preload="metadata"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
              <button className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-600 text-white shadow-lg">
                <Play size={24} fill="white" />
              </button>
            </div>
            {!uploading && !removing && (
              <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 transition-all group-hover:opacity-100">
                {onUpload && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] font-medium text-stone-700 shadow-sm backdrop-blur-sm transition-all hover:bg-white"
                  >
                    <RefreshCw size={12} /> Replace
                  </button>
                )}
                {onRemove && (
                  <button
                    onClick={async () => {
                      setRemoving(true);
                      try {
                        await onRemove(scene.id);
                      } finally {
                        setRemoving(false);
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] font-medium text-red-600 shadow-sm backdrop-blur-sm transition-all hover:bg-red-50"
                  >
                    <Trash2 size={12} /> Remove
                  </button>
                )}
              </div>
            )}
            <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              SCENE {String(scene.number).padStart(2, "0")}
            </span>
          </>
        ) : isGenerating ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-linear-to-br from-orange-950 to-stone-900">
            <div className="relative flex h-12 w-12 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-orange-500/20" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-orange-900">
                <Sparkles size={18} className="animate-pulse text-orange-400" />
              </div>
            </div>
            <p className="text-sm font-semibold text-stone-300">
              Generating Scene {String(scene.number).padStart(2, "0")}...
            </p>
            <div className="h-1 w-24 overflow-hidden rounded-full bg-stone-700">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-orange-600" />
            </div>
          </div>
        ) : onUpload ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-full w-full flex-col items-center justify-center gap-2 transition-colors hover:bg-stone-800"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-stone-600 text-stone-400 transition-colors group-hover:border-orange-500 group-hover:text-orange-500">
              <Film size={20} />
            </div>
            <span className="text-xs font-medium text-stone-400">
              Upload footage or drag &amp; drop
            </span>
          </button>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-600/80 text-white">
              <Play size={24} fill="white" />
            </div>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={28} className="animate-spin text-orange-500" />
              <span className="text-xs font-medium text-stone-300">
                Uploading...
              </span>
            </div>
          </div>
        )}

        {removing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <Loader2 size={24} className="animate-spin text-red-500" />
          </div>
        )}

        {dragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-orange-950/90 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Upload size={28} className="text-orange-400" />
              <span className="text-xs font-semibold text-orange-300">
                Drop video here
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Scene Info */}
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-900">
            Scene {String(scene.number).padStart(2, "0")}: {scene.title}
          </h3>
          <span className="text-xs text-stone-400">
            {formatDuration(scene.duration)}
          </span>
        </div>
        <p className="line-clamp-2 text-xs text-stone-500">{scene.actions}</p>

        {/* Inline Prompt */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter editing suggestions or prompts..."
            className="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600 placeholder:text-stone-400 focus:border-orange-300 focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleQuickEdit()}
          />
          <button
            onClick={handleQuickEdit}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:bg-stone-50 hover:text-orange-600"
          >
            <Sparkles size={14} />
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-stone-100 pt-3">
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <Camera size={12} className="text-orange-600" />
            <span className="uppercase">{scene.cameraNote || "STANDARD"}</span>
          </div>
          <Link
            href={`/editor/${scene.id}?project=${projectId}`}
            className="flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-orange-600"
          >
            <Edit3 size={12} /> EDIT
          </Link>
        </div>
      </div>
    </div>
  );
}
