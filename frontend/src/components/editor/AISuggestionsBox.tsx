"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

interface AISuggestionsBoxProps {
  sceneId: string;
  projectId: string;
  onEditSubmitted: () => void;
}

export default function AISuggestionsBox({
  sceneId,
  projectId,
  onEditSubmitted,
}: AISuggestionsBoxProps) {
  const [instruction, setInstruction] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!instruction.trim()) return;
    setProcessing(true);
    try {
      const API_BASE =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      await fetch(
        `${API_BASE}/api/scenes/${sceneId}/edit?project_id=${projectId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instruction }),
        }
      );
      setInstruction("");
      onEditSubmitted();
    } catch {
      // Error handling
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={18} className="text-orange-600" />
        <h3 className="text-base font-bold text-stone-900">
          AI Suggestions & Edits
        </h3>
      </div>
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g., 'Make the lighting more dramatic and shift the background to a futuristic Tokyo skyline...'"
          className="w-full resize-none rounded-lg bg-transparent text-sm text-stone-600 placeholder:text-stone-400 focus:outline-none"
          rows={3}
        />
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={processing || !instruction.trim()}
            className="flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
          >
            {processing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            Interpret Instruction
          </button>
        </div>
      </div>
    </div>
  );
}
