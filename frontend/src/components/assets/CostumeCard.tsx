"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, Loader2, ImagePlus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import type { Costume } from "@/types";

interface CostumeCardProps {
  costume: Costume;
  index: number;
  onUpload?: (assetId: string, file: File) => Promise<void>;
  onRemove?: (assetId: string) => Promise<void>;
  onDelete?: (assetId: string) => Promise<void>;
  generating?: boolean;
}

export default function CostumeCard({ costume, index, onUpload, onRemove, onDelete, generating }: CostumeCardProps) {
  const tag = `#C-${String(index + 1).padStart(2, "0")}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const processFile = useCallback(async (file: File) => {
    if (!onUpload || !file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      await onUpload(costume.id, file);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [onUpload, costume.id]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const hasImage = !!costume.imageUrl;

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div
        className={`relative aspect-3/4 w-full overflow-hidden transition-all ${
          dragOver ? "ring-2 ring-inset ring-orange-400 bg-orange-50" : "bg-stone-200"
        }`}
        onDragOver={(e) => { e.preventDefault(); if (onUpload) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {hasImage ? (
          <>
            <img
              src={costume.imageUrl!}
              alt={costume.name}
              className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            {!uploading && !removing && (
              <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 transition-all group-hover:opacity-100">
                {onUpload && (
                  <button
                    onClick={() => inputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] font-medium text-stone-700 shadow-sm backdrop-blur-sm transition-all hover:bg-white"
                  >
                    <RefreshCw size={12} />
                    Replace
                  </button>
                )}
                {onRemove && (
                  <button
                    onClick={async () => { setRemoving(true); try { await onRemove(costume.id); } finally { setRemoving(false); } }}
                    className="flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] font-medium text-red-600 shadow-sm backdrop-blur-sm transition-all hover:bg-red-50"
                  >
                    <Trash2 size={12} />
                    Remove
                  </button>
                )}
              </div>
            )}
            {removing && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                <Loader2 size={24} className="animate-spin text-red-500" />
              </div>
            )}
          </>
        ) : generating ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-linear-to-br from-orange-50 to-stone-100">
            <div className="relative flex h-12 w-12 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-orange-200/40" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
                <Sparkles size={18} className="animate-pulse text-orange-600" />
              </div>
            </div>
            <span className="text-xs font-medium text-orange-600">Generating...</span>
          </div>
        ) : onUpload ? (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-full w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-stone-300 transition-colors hover:border-orange-400 hover:bg-orange-50/50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-200 transition-colors group-hover:bg-orange-100">
              <ImagePlus size={18} className="text-stone-400 transition-colors group-hover:text-orange-600" />
            </div>
            <span className="text-xs font-medium text-stone-400 transition-colors group-hover:text-stone-600">Upload Image</span>
          </button>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="h-12 w-12 animate-pulse rounded-full bg-stone-300" />
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={24} className="animate-spin text-orange-600" />
              <span className="text-xs font-medium text-stone-600">Uploading...</span>
            </div>
          </div>
        )}

        {dragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-orange-50/90 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Upload size={24} className="text-orange-600" />
              <span className="text-xs font-semibold text-orange-600">Drop image here</span>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
          className="hidden"
        />
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-stone-900">{costume.name}</h3>
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
              {tag}
            </span>
            {onDelete && (
              <button
                onClick={async () => { setDeleting(true); try { await onDelete(costume.id); } catch { setDeleting(false); } }}
                disabled={deleting}
                className="flex shrink-0 items-center rounded-md px-1.5 py-1 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                title="Remove asset"
              >
                {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              </button>
            )}
          </div>
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-stone-500">
          {costume.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-1">
          {costume.materials.map((mat) => (
            <span
              key={mat}
              className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase text-stone-500"
            >
              {mat}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
