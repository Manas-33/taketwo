"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/hooks/useProject";
import { uploadAsset, removeAssetImage, deleteAsset } from "@/lib/api";
import CharacterCard from "@/components/assets/CharacterCard";
import PropCard from "@/components/assets/PropCard";
import CostumeCard from "@/components/assets/CostumeCard";
import { Loader2, Sparkles, ArrowRight, Plus } from "lucide-react";
import type { Character, Prop, Costume } from "@/types";

export default function AssetsPage() {
  const { project, projectId, refresh } = useProject();
  const router = useRouter();
  const [generating, setGenerating] = useState(false);

  const characters: Character[] = project?.scriptData?.characters ?? [];
  const props: Prop[] = project?.scriptData?.props ?? [];
  const costumes: Costume[] = project?.scriptData?.costumes ?? [];

  const isGenerating = project?.status === "assets_generating" || generating;
  const allAssets = [...characters, ...props, ...costumes];
  const allHaveImages = allAssets.length > 0 && allAssets.every((a) => a.imageUrl);
  const someHaveImages = allAssets.some((a) => a.imageUrl);

  const handleUploadAsset = useCallback(
    async (assetType: "characters" | "props" | "costumes", assetId: string, file: File) => {
      if (!projectId) return;
      await uploadAsset(projectId, assetType, assetId, file);
      refresh();
    },
    [projectId, refresh],
  );

  const handleCharacterUpload = useCallback(
    (assetId: string, file: File) => handleUploadAsset("characters", assetId, file),
    [handleUploadAsset],
  );

  const handlePropUpload = useCallback(
    (assetId: string, file: File) => handleUploadAsset("props", assetId, file),
    [handleUploadAsset],
  );

  const handleCostumeUpload = useCallback(
    (assetId: string, file: File) => handleUploadAsset("costumes", assetId, file),
    [handleUploadAsset],
  );

  const handleRemoveAsset = useCallback(
    async (assetType: "characters" | "props" | "costumes", assetId: string) => {
      if (!projectId) return;
      await removeAssetImage(projectId, assetType, assetId);
      refresh();
    },
    [projectId, refresh],
  );

  const handleCharacterRemove = useCallback(
    (assetId: string) => handleRemoveAsset("characters", assetId),
    [handleRemoveAsset],
  );

  const handlePropRemove = useCallback(
    (assetId: string) => handleRemoveAsset("props", assetId),
    [handleRemoveAsset],
  );

  const handleCostumeRemove = useCallback(
    (assetId: string) => handleRemoveAsset("costumes", assetId),
    [handleRemoveAsset],
  );

  const handleDeleteAsset = useCallback(
    async (assetType: "characters" | "props" | "costumes", assetId: string) => {
      if (!projectId) return;
      await deleteAsset(projectId, assetType, assetId);
      refresh();
    },
    [projectId, refresh],
  );

  const handleCharacterDelete = useCallback(
    (assetId: string) => handleDeleteAsset("characters", assetId),
    [handleDeleteAsset],
  );

  const handlePropDelete = useCallback(
    (assetId: string) => handleDeleteAsset("props", assetId),
    [handleDeleteAsset],
  );

  const handleCostumeDelete = useCallback(
    (assetId: string) => handleDeleteAsset("costumes", assetId),
    [handleDeleteAsset],
  );

  const handleGenerate = async () => {
    if (!projectId) return;
    setGenerating(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      await fetch(`${API_BASE}/api/assets/generate/${projectId}`, { method: "POST" });
    } catch {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (project?.status === "assets_ready") {
      setGenerating(false);
    }
  }, [project?.status]);

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

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-stone-900">
            Production Assets
          </h1>
          <p className="mt-2 max-w-md text-sm text-stone-500">
            A curated collection of visual references for{" "}
            {project?.title || "your project"}. Manage characters, environmental
            props, and costume designs in one place.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!allHaveImages && !isGenerating && allAssets.length > 0 && (
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
            >
              <Sparkles size={16} /> Generate Remaining Assets
            </button>
          )}
          {allHaveImages && (
            <button
              onClick={() => router.push("/scenes")}
              className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
            >
              <ArrowRight size={16} /> Continue to Scenes
            </button>
          )}
          <button className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700">
            <Plus size={16} /> New Asset
          </button>
        </div>
      </div>

      {isGenerating && (
        <div className="mt-8 flex items-center gap-3 rounded-xl bg-orange-50 border border-orange-200 p-4">
          <Loader2 size={20} className="animate-spin text-orange-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-800">
              Generating visual assets with AI...
            </p>
            <p className="mt-0.5 text-xs text-orange-600/70">
              {allAssets.filter((a) => a.imageUrl).length} of {allAssets.length} complete — images appear as they&apos;re ready
            </p>
          </div>
        </div>
      )}

      {/* Characters Section */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1 rounded-full bg-orange-600" />
            <h2 className="text-xl font-bold text-stone-900">Characters</h2>
            <span className="text-sm text-stone-400">
              {characters.length} TOTAL
            </span>
          </div>
          {characters.length > 4 && (
            <button className="flex items-center gap-1 text-sm font-medium text-orange-600 hover:underline">
              View All <ArrowRight size={14} />
            </button>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
          {characters.slice(0, 4).map((char) => (
            <CharacterCard key={char.id} character={char} onUpload={handleCharacterUpload} onRemove={handleCharacterRemove} onDelete={handleCharacterDelete} generating={isGenerating && !char.imageUrl} />
          ))}
        </div>
      </section>

      {/* Props Section */}
      <section className="mt-12">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-orange-600" />
          <h2 className="text-xl font-bold text-stone-900">Props</h2>
          <span className="text-sm text-stone-400">{props.length} TOTAL</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5">
          {props.slice(0, 5).map((prop) => (
            <PropCard key={prop.id} prop={prop} onUpload={handlePropUpload} onRemove={handlePropRemove} onDelete={handlePropDelete} generating={isGenerating && !prop.imageUrl} />
          ))}
        </div>
      </section>

      {/* Costumes Section */}
      <section className="mt-12">
        <div className="flex items-center gap-3">
          <div className="h-6 w-1 rounded-full bg-orange-600" />
          <h2 className="text-xl font-bold text-stone-900">Costumes</h2>
          <span className="text-sm text-stone-400">
            {costumes.length} TOTAL
          </span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {costumes.slice(0, 3).map((costume, i) => (
            <CostumeCard key={costume.id} costume={costume} index={i} onUpload={handleCostumeUpload} onRemove={handleCostumeRemove} onDelete={handleCostumeDelete} generating={isGenerating && !costume.imageUrl} />
          ))}
        </div>
      </section>

      {/* AI Insight Bar */}
      {characters.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-3 shadow-lg border border-stone-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
              <Sparkles size={16} className="text-orange-600" />
            </div>
            <p className="text-sm text-stone-600">
              <span className="font-bold text-orange-600">FILMAI INSIGHT</span>{" "}
              {allHaveImages
                ? "All assets ready. Review and proceed to scene generation."
                : someHaveImages
                ? `${allAssets.filter((a) => !a.imageUrl).length} assets remaining — upload your own or generate with AI.`
                : `${characters.length} characters, ${props.length} props, and ${costumes.length} costumes detected.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
