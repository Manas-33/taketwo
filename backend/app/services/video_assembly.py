import os
import logging
import tempfile
import asyncio
import subprocess
from app.services.storage_service import download_file, upload_file

logger = logging.getLogger("filmai.assembly")


def _has_audio_stream(file_path: str) -> bool:
    """Probe a video file to check whether it contains an audio stream."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-select_streams", "a",
            "-show_entries", "stream=codec_type",
            "-of", "csv=p=0",
            file_path,
        ],
        capture_output=True,
        text=True,
    )
    return "audio" in result.stdout


def _normalize_clip(input_path: str, output_path: str):
    """Re-encode a clip to a consistent format (H.264 + AAC).

    If the source has no audio stream, a silent stereo track is generated so
    that every normalized clip has identical stream layouts for the concat
    demuxer.
    """
    has_audio = _has_audio_stream(input_path)

    cmd = ["ffmpeg", "-y", "-i", input_path]

    if not has_audio:
        cmd.extend(["-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"])
        stream_maps = ["-map", "0:v:0", "-map", "1:a:0"]
        extra_flags = ["-shortest"]
    else:
        stream_maps = ["-map", "0:v:0", "-map", "0:a:0"]
        extra_flags = []

    cmd.extend(stream_maps)
    cmd.extend([
        "-c:v", "libx264", "-preset", "fast", "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-ar", "44100", "-ac", "2",
    ])
    cmd.extend(extra_flags)
    cmd.extend(["-movflags", "+faststart", output_path])

    logger.info("Normalizing clip (audio=%s): %s", has_audio, " ".join(cmd))
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        logger.error(
            "FFmpeg normalization FAILED (exit %d)\nstderr: %s",
            proc.returncode, proc.stderr,
        )
        raise RuntimeError(f"FFmpeg normalization failed: {proc.stderr}")


async def assemble_scenes(scene_video_paths: list[str], project_id: str) -> str:
    with tempfile.TemporaryDirectory() as tmpdir:
        local_files = []
        for i, path in enumerate(scene_video_paths):
            logger.info("Downloading scene video %d/%d: %s", i + 1, len(scene_video_paths), path)
            video_bytes = download_file(path)
            local_path = os.path.join(tmpdir, f"scene_{i:03d}.mp4")
            with open(local_path, "wb") as f:
                f.write(video_bytes)
            local_files.append(local_path)
            logger.info("Scene video %d saved locally (%d bytes)", i + 1, len(video_bytes))

        if not local_files:
            logger.warning("No local files to assemble")
            return ""

        if len(local_files) == 1:
            logger.info("Only one scene — normalizing and saving as final video")
            norm_path = os.path.join(tmpdir, "norm_000.mp4")
            await asyncio.to_thread(_normalize_clip, local_files[0], norm_path)
            with open(norm_path, "rb") as f:
                video_bytes = f.read()
            dest = f"projects/{project_id}/export/final.mp4"
            return upload_file(video_bytes, dest, "video/mp4")

        normalized_files = []
        for i, local_path in enumerate(local_files):
            norm_path = os.path.join(tmpdir, f"norm_{i:03d}.mp4")
            logger.info("Normalizing clip %d/%d...", i + 1, len(local_files))
            await asyncio.to_thread(_normalize_clip, local_path, norm_path)
            normalized_files.append(norm_path)

        concat_file = os.path.join(tmpdir, "concat.txt")
        with open(concat_file, "w") as f:
            for lf in normalized_files:
                f.write(f"file '{lf}'\n")

        output_path = os.path.join(tmpdir, "final.mp4")
        cmd = [
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", concat_file,
            "-c", "copy",
            "-movflags", "+faststart",
            output_path,
        ]
        logger.info("Running FFmpeg concat: %s", " ".join(cmd))
        proc = await asyncio.to_thread(
            subprocess.run, cmd, capture_output=True, text=True,
        )
        if proc.returncode != 0:
            logger.error(
                "FFmpeg concat FAILED (exit code %d)\nstdout: %s\nstderr: %s",
                proc.returncode, proc.stdout, proc.stderr,
            )
            raise RuntimeError(f"FFmpeg concat failed: {proc.stderr}")
        logger.info("FFmpeg concat completed successfully")

        with open(output_path, "rb") as f:
            final_bytes = f.read()

        dest = f"projects/{project_id}/export/final.mp4"
        url = upload_file(final_bytes, dest, "video/mp4")
        logger.info("Final video uploaded: %s (%d bytes)", dest, len(final_bytes))
        return url
