"use client";

import type { Scene } from "@/types";
import { CheckCircle2 } from "lucide-react";

interface ProjectTimelineProps {
  scenes: Scene[];
}

export default function ProjectTimeline({ scenes }: ProjectTimelineProps) {
  const sorted = [...scenes].sort((a, b) => a.number - b.number);
  let cumulativeTime = 0;

  const timelineItems = sorted.map((scene) => {
    const start = cumulativeTime;
    const dur = scene.duration || 0;
    cumulativeTime += dur;
    return { scene, startTime: start, endTime: cumulativeTime };
  });

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-stone-900">Project Timeline</h2>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50">
            VFX Layers
          </button>
          <button className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50">
            Audio Mix
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-4 overflow-x-auto pb-4">
        {timelineItems.map(({ scene, startTime, endTime }) => (
          <div
            key={scene.id}
            className={`flex min-w-[180px] flex-col rounded-xl border-2 overflow-hidden transition-colors ${
              scene.status === "approved"
                ? "border-orange-500"
                : "border-stone-200"
            }`}
          >
            <div className="relative aspect-video w-full bg-stone-800">
              {scene.videoUrl ? (
                <video
                  key={scene.videoUrl}
                  src={scene.videoUrl}
                  className="h-full w-full object-cover"
                  muted
                  preload="metadata"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="h-6 w-6 animate-pulse rounded-full bg-stone-600" />
                </div>
              )}
            </div>
            <div className="p-2.5">
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold ${
                    scene.status === "approved"
                      ? "text-orange-600"
                      : "text-stone-700"
                  }`}
                >
                  Scene {String(scene.number).padStart(2, "0")}: {scene.title}
                </span>
                {scene.status === "approved" && (
                  <CheckCircle2 size={14} className="text-green-500" />
                )}
              </div>
              <p className="mt-0.5 text-[10px] text-stone-400">
                {formatTime(startTime)} - {formatTime(endTime)}
              </p>
            </div>
          </div>
        ))}

        {/* Add scene placeholder */}
        <div className="flex min-w-[180px] items-center justify-center rounded-xl border-2 border-dashed border-stone-300">
          <p className="text-xs text-stone-400">Approve more scenes</p>
        </div>
      </div>
    </div>
  );
}
