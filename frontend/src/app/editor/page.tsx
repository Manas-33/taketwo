"use client";

import { useRouter } from "next/navigation";
import { useProject } from "@/hooks/useProject";
import { Film } from "lucide-react";

export default function EditorIndexPage() {
  const { project, projectId } = useProject();
  const router = useRouter();
  const scenes = project?.scriptData?.scenes ?? [];

  if (!projectId || scenes.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-73px)] items-center justify-center">
        <div className="text-center">
          <Film size={48} className="mx-auto text-stone-300" />
          <p className="mt-4 text-lg text-stone-500">No scenes to edit.</p>
          <button
            onClick={() => router.push("/scenes")}
            className="mt-4 text-orange-600 hover:underline"
          >
            Go to Scene Gallery
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold text-stone-900">Select a Scene to Edit</h1>
      <p className="mt-2 text-sm text-stone-500">
        Choose a scene from your project to open in the editor.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {scenes.map((scene) => (
          <button
            key={scene.id}
            onClick={() =>
              router.push(`/editor/${scene.id}?project=${projectId}`)
            }
            className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-4 text-left transition-all hover:border-orange-300 hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-stone-100 text-sm font-bold text-stone-600">
              {String(scene.number).padStart(2, "0")}
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-900">
                {scene.title}
              </p>
              <p className="text-xs text-stone-500">{scene.location}</p>
            </div>
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                scene.status === "generated" || scene.status === "approved"
                  ? "bg-green-100 text-green-700"
                  : scene.status === "generating"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-stone-100 text-stone-500"
              }`}
            >
              {scene.status}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
