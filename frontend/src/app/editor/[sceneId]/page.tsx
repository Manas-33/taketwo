"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import VideoPlayer from "@/components/editor/VideoPlayer";
import AISuggestionsBox from "@/components/editor/AISuggestionsBox";
import TransformationPanel from "@/components/editor/TransformationPanel";
import {
  RotateCcw,
  History,
  ArrowLeft,
} from "lucide-react";
import type { Project, Scene, SceneEdits } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";


export default function EditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sceneId = params.sceneId as string;
  const projectId = searchParams.get("project") || (typeof window !== "undefined" ? localStorage.getItem("filmai_project_id") : "") || "";

  const [project, setProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const fetchProject = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/script/project/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data);
        }
      } catch {
        // Will retry on next poll
      }
    };

    fetchProject();
    intervalRef.current = setInterval(fetchProject, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [projectId]);

  const scene: Scene | undefined = project?.scriptData?.scenes?.find(
    (s) => s.id === sceneId
  );

  const handleTransform = async (transforms: Partial<SceneEdits>) => {
    if (!scene) return;
    setSaving(true);
    try {
      await fetch(
        `${API_BASE}/api/scenes/${sceneId}/transform?project_id=${projectId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transforms),
        }
      );
    } catch {
      // Error handling
    } finally {
      setSaving(false);
    }
  };

  if (!projectId || !scene) {
    return (
      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-stone-500">Scene not found.</p>
          <button
            onClick={() => router.push("/scenes")}
            className="mt-4 text-orange-600 hover:underline"
          >
            Back to Scene Gallery
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-73px)]">
      {/* Center Content */}
      <div className="flex flex-1 flex-col overflow-y-auto px-8 py-6">
        <button
          onClick={() => router.push("/scenes")}
          className="mb-4 flex w-fit items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
        >
          <ArrowLeft size={16} />
          Back to Scenes
        </button>
        <VideoPlayer videoUrl={scene.videoUrl} />
        <AISuggestionsBox
          sceneId={sceneId}
          projectId={projectId}
          onEditSubmitted={() => {}}
        />

        {/* Bottom Bar */}
        <div className="mt-auto flex items-center justify-between border-t border-stone-200 pt-4">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800">
              <RotateCcw size={16} /> Revert
            </button>
            <button className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800">
              <History size={16} /> History
            </button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Transformation Panel */}
      <aside className="w-72 overflow-y-auto border-l border-stone-200 bg-white px-5 py-6">
        <TransformationPanel
          edits={scene.edits}
          onTransform={handleTransform}
          saving={saving}
        />
      </aside>
    </div>
  );
}
