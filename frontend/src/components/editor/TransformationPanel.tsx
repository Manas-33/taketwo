"use client";

import { useState } from "react";
import { Upload, Sparkles } from "lucide-react";
import type { SceneEdits } from "@/types";

const BACKGROUNDS = [
  { id: "current", label: "CURRENT", color: "bg-orange-900" },
  { id: "neon_pulse", label: "NEON PULSE", color: "bg-pink-900" },
  { id: "alpine_night", label: "ALPINE NIGHT", color: "bg-blue-900" },
  { id: "custom", label: "Custom", color: "bg-stone-300" },
];

const COLOR_GRADES = [
  { id: "golden", label: "GOLDEN", color: "bg-amber-500" },
  { id: "moody", label: "MOODY", color: "bg-indigo-800" },
  { id: "vintage", label: "VINTAGE", color: "bg-amber-700" },
  { id: "cool", label: "COOL", color: "bg-teal-500" },
];

interface TransformationPanelProps {
  edits: SceneEdits;
  onTransform: (transforms: Partial<SceneEdits>) => void;
  saving: boolean;
}

export default function TransformationPanel({
  edits,
  onTransform,
  saving,
}: TransformationPanelProps) {
  const [localEdits, setLocalEdits] = useState<SceneEdits>(edits);

  const handleSliderChange = (key: keyof SceneEdits, value: number) => {
    setLocalEdits((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onTransform(localEdits);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-stone-200 pb-4">
        <h2 className="text-lg font-bold text-stone-900">
          Transformation Panel
        </h2>
        <p className="text-xs uppercase tracking-wider text-stone-400">
          ENVIRONMENTAL STUDIO
        </p>
      </div>

      {/* Background Shift */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-800">
            Background Shift
          </h3>
          <button className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:underline">
            <Upload size={12} /> Upload Custom
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {BACKGROUNDS.map((bg) => (
            <button
              key={bg.id}
              onClick={() => {
                const val = bg.id === "current" ? null : bg.id;
                setLocalEdits((prev) => ({ ...prev, backgroundShift: val }));
              }}
              className={`relative aspect-video overflow-hidden rounded-lg ${bg.color} transition-all ${
                (localEdits.backgroundShift === bg.id) ||
                (bg.id === "current" && !localEdits.backgroundShift)
                  ? "ring-2 ring-orange-600"
                  : "ring-1 ring-stone-200 hover:ring-stone-400"
              }`}
            >
              {((bg.id === "current" && !localEdits.backgroundShift) ||
                localEdits.backgroundShift === bg.id) && (
                <span className="absolute bottom-1 left-1 rounded bg-orange-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  {bg.label}
                </span>
              )}
              {bg.id === "custom" && (
                <div className="flex h-full items-center justify-center">
                  <Upload size={16} className="text-stone-500" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Color Grade */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-stone-800">Color Grade</h3>
        <div className="mt-3 flex items-center gap-3">
          {COLOR_GRADES.map((grade) => (
            <button
              key={grade.id}
              onClick={() =>
                setLocalEdits((prev) => ({ ...prev, colorGrade: grade.id }))
              }
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className={`h-10 w-10 rounded-full ${grade.color} transition-all ${
                  localEdits.colorGrade === grade.id
                    ? "ring-2 ring-orange-600 ring-offset-2"
                    : "ring-1 ring-stone-200 hover:ring-stone-400"
                }`}
              />
              <span className="text-[10px] font-medium uppercase text-stone-500">
                {grade.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Refinement Sliders */}
      <div className="mt-6 space-y-5">
        <h3 className="text-sm font-semibold text-stone-800">
          Refinement Sliders
        </h3>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-stone-600">Brightness</span>
            <span className="text-xs font-semibold text-orange-600">
              {Math.round(localEdits.brightness)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={200}
            value={localEdits.brightness}
            onChange={(e) =>
              handleSliderChange("brightness", Number(e.target.value))
            }
            className="w-full"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-stone-600">AI Blend Intensity</span>
            <span className="text-xs font-semibold text-orange-600">
              {Math.round(localEdits.aiBlend)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={localEdits.aiBlend}
            onChange={(e) =>
              handleSliderChange("aiBlend", Number(e.target.value))
            }
            className="w-full"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-stone-600">Blur Depth</span>
            <span className="text-xs font-semibold text-orange-600">
              {Math.round(localEdits.blurDepth)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={localEdits.blurDepth}
            onChange={(e) =>
              handleSliderChange("blurDepth", Number(e.target.value))
            }
            className="w-full"
          />
        </div>
      </div>

      {/* AI Insight */}
      <div className="mt-6 rounded-xl bg-orange-50 border border-orange-200 p-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-orange-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700">
            ARCHITECTURAL INSIGHT
          </span>
        </div>
        <p className="mt-1 text-xs text-stone-600">
          The current lighting grid matches the scene&apos;s mood. Adjusting
          brightness above 80% may wash out shadow detail.
        </p>
      </div>

      {/* Bottom sticky */}
      <div className="mt-auto pt-4">
        <p className="mb-3 text-center text-[10px] italic text-stone-400">
          All edits are non-destructive and cloud-synced
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-lg bg-orange-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
