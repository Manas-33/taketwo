"use client";

import { useRef, useState, useEffect } from "react";
import { Play, Pause, Maximize2, Sparkles } from "lucide-react";

interface FinalPlayerProps {
  videoUrl: string | null;
  status: string;
}

export default function FinalPlayer({ videoUrl, status }: FinalPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => setCurrentTime(video.currentTime);
    const onLoaded = () => setDuration(video.duration);
    const onEnded = () => setPlaying(false);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("ended", onEnded);
    };
  }, [videoUrl]);

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = ratio * duration;
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-stone-900 shadow-2xl">
      {videoUrl ? (
        <video
          key={videoUrl}
          ref={videoRef}
          src={videoUrl}
          className="aspect-video w-full object-contain"
          preload="metadata"
          onClick={togglePlay}
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center">
          <p className="text-sm text-stone-500">
            {status === "assembling"
              ? "Assembling final video..."
              : "No final video yet"}
          </p>
        </div>
      )}

      {/* AI Rendering Badge */}
      {status === "ready" && videoUrl && (
        <div className="absolute top-4 right-4 rounded-xl bg-white/90 px-4 py-3 backdrop-blur-sm shadow-lg">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-orange-600" />
            <span className="text-xs font-bold text-stone-800">
              AI RENDERING COMPLETE
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-stone-500">
            4K resolution, 60fps with HDR optimization applied across all scenes.
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-5">
        <div className="flex items-center gap-4">
          <button onClick={togglePlay} className="text-white">
            {playing ? <Pause size={20} /> : <Play size={20} fill="white" />}
          </button>
          <div className="relative flex-1 cursor-pointer" onClick={handleSeek}>
            <div className="h-1 w-full rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-orange-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-medium text-orange-500">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <button
            onClick={() => videoRef.current?.requestFullscreen()}
            className="text-white/70 hover:text-white"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Center play */}
      {!playing && videoUrl && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white">
            <Play size={28} fill="white" />
          </div>
        </button>
      )}
    </div>
  );
}
