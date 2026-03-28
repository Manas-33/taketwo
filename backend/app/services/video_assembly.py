import os
import logging
import tempfile
import subprocess
from app.services.storage_service import download_file, upload_file

logger = logging.getLogger("filmai.assembly")


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
            logger.info("Only one scene, copying directly as final video")
            with open(local_files[0], "rb") as f:
                video_bytes = f.read()
            dest = f"projects/{project_id}/export/final.mp4"
            return upload_file(video_bytes, dest, "video/mp4")

        concat_file = os.path.join(tmpdir, "concat.txt")
        with open(concat_file, "w") as f:
            for lf in local_files:
                f.write(f"file '{lf}'\n")

        output_path = os.path.join(tmpdir, "final.mp4")
        cmd = [
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", concat_file,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "aac",
            "-movflags", "+faststart",
            output_path,
        ]
        logger.info("Running FFmpeg: %s", " ".join(cmd))
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            logger.error("FFmpeg FAILED (exit code %d)\nstdout: %s\nstderr: %s", proc.returncode, proc.stdout, proc.stderr)
            raise RuntimeError(f"FFmpeg failed: {proc.stderr}")
        logger.info("FFmpeg completed successfully")

        with open(output_path, "rb") as f:
            final_bytes = f.read()

        dest = f"projects/{project_id}/export/final.mp4"
        url = upload_file(final_bytes, dest, "video/mp4")
        logger.info("Final video uploaded: %s (%d bytes)", dest, len(final_bytes))
        return url
