"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ScriptUploader from "@/components/script/ScriptUploader";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";

export default function ScriptPage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUploadComplete = (id: string) => {
    setProjectId(id);
    localStorage.setItem("filmai_project_id", id);
  };

  const handleAnalyze = async () => {
    if (!projectId) return;
    setAnalyzing(true);
    setError(null);
    try {
      const API_BASE =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_BASE}/api/script/analyze/${projectId}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Analysis failed");

      const poll = async () => {
        const pRes = await fetch(`${API_BASE}/api/script/project/${projectId}`);
        const project = await pRes.json();
        if (project.status === "analyzed") {
          setAnalyzing(false);
          setAnalyzed(true);
          setTimeout(() => router.push("/assets"), 1500);
        } else if (project.status === "analyzing") {
          setTimeout(poll, 3000);
        } else {
          setAnalyzing(false);
          setError("Analysis failed. Please try again.");
        }
      };
      setTimeout(poll, 3000);
    } catch {
      setAnalyzing(false);
      setError("Failed to start analysis.");
    }
  };

  if (!projectId) {
    return <ScriptUploader onUploadComplete={handleUploadComplete} />;
  }

  return (
    <div className="flex min-h-[calc(100vh-73px)] flex-col items-center justify-center px-4">
      <h1 className="mb-10 text-5xl font-bold tracking-tight text-stone-900 md:text-6xl">
        Upload Script
      </h1>

      <div className="flex w-full max-w-2xl flex-col items-center gap-6 rounded-2xl border border-stone-200 bg-white px-8 py-12">
        {analyzed ? (
          <>
            <CheckCircle2 size={56} className="text-green-500" />
            <p className="text-lg font-semibold text-stone-800">
              Analysis Complete
            </p>
            <p className="text-sm text-stone-500">
              Redirecting to Asset Library...
            </p>
          </>
        ) : analyzing ? (
          <>
            <Loader2 size={56} className="animate-spin text-orange-600" />
            <p className="text-lg font-semibold text-stone-800">
              Analyzing Script...
            </p>
            <p className="text-sm text-stone-500">
              Gemini is extracting characters, props, costumes, and scenes.
            </p>
          </>
        ) : (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <p className="text-lg font-semibold text-stone-800">
              Script Uploaded Successfully
            </p>
            <p className="text-sm text-stone-500">
              Click below to begin AI analysis and scene breakdown.
            </p>
            <button
              onClick={handleAnalyze}
              className="mt-2 flex items-center gap-2 rounded-lg bg-orange-600 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
            >
              <Sparkles size={18} />
              Analyze Script
            </button>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
