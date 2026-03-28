"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileText, Loader2, Sparkles } from "lucide-react";

interface ScriptUploaderProps {
  onUploadComplete: (projectId: string) => void;
}

export default function ScriptUploader({ onUploadComplete }: ScriptUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const validTypes = [
        "application/pdf",
        "text/plain",
        "application/octet-stream",
      ];
      const validExts = [".pdf", ".fdx", ".txt"];
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

      if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
        setError("Please upload a .PDF, .FDX, or .TXT file");
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        setError("File too large. Maximum size is 25MB");
        return;
      }

      setError(null);
      setFileName(file.name);
      setUploading(true);

      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch(`${API_BASE}/api/script/upload`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        onUploadComplete(data.projectId);
      } catch {
        setError("Failed to upload script. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [onUploadComplete]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="flex min-h-[calc(100vh-73px)] flex-col items-center justify-center px-4">
      <h1 className="mb-10 text-5xl font-bold tracking-tight text-stone-900 md:text-6xl">
        Upload Script
      </h1>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`flex w-full max-w-2xl flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-8 py-16 transition-all ${
          isDragging
            ? "border-orange-400 bg-orange-50"
            : "border-stone-300 bg-stone-50/50"
        }`}
      >
        {uploading ? (
          <Loader2 size={48} className="animate-spin text-orange-600" />
        ) : fileName ? (
          <FileText size={48} className="text-orange-600" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-600 text-white">
            <Upload size={28} />
          </div>
        )}

        {fileName ? (
          <p className="text-lg font-medium text-stone-700">{fileName}</p>
        ) : (
          <>
            <p className="text-lg font-medium text-stone-700">
              Drop your .FDX or .PDF here
            </p>
            <p className="text-sm text-stone-400">Maximum file size: 25MB</p>
          </>
        )}

        {!uploading && !fileName && (
          <button
            onClick={() => inputRef.current?.click()}
            className="mt-2 rounded-lg border border-stone-300 px-6 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
          >
            Browse Files
          </button>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.fdx,.txt"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="hidden"
        />
      </div>

      <div className="mt-8 flex items-center gap-3 text-sm text-stone-400">
        <span className="h-px w-12 bg-stone-300" />
        READY FOR PROCESSING
        <span className="h-px w-12 bg-stone-300" />
      </div>

      <div className="fixed bottom-6 right-6">
        <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 shadow-lg border border-stone-100">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100">
            <Sparkles size={20} className="text-stone-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-800">Ready to analyze</p>
            <p className="text-xs text-stone-400">
              Upload your script to begin AI continuity and scene breakdown.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
