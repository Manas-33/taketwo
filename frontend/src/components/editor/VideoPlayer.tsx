"use client";

import { useRef, useState, useEffect } from "react";
import { Play, Pause, Maximize2 } from "lucide-react";

interface VideoPlayerProps {
  videoUrl: string | null;
}

export default function VideoPlayer({ videoUrl }: VideoPlayerProps) {
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
    <div className="relative overflow-hidden rounded-xl bg-stone-900">
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          className="aspect-video w-full object-contain"
          preload="metadata"
          onClick={togglePlay}
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center">
          <p className="text-sm text-stone-500">No video generated yet</p>
        </div>
      )}

      {/* Controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-white">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <div
            className="relative flex-1 cursor-pointer"
            onClick={handleSeek}
          >
            <div className="h-1 w-full rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-orange-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              videoRef.current?.requestFullscreen();
            }}
            className="text-white/70 hover:text-white"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {/* Center play button */}
      {!playing && videoUrl && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-600/90 text-white shadow-lg transition-transform hover:scale-110">
            <Play size={28} fill="white" />
          </div>
        </button>
      )}
    </div>
  );
}
