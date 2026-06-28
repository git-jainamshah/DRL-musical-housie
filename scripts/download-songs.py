#!/usr/bin/env python3
"""Download housie song audio from YouTube using yt-dlp."""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

try:
    import certifi

    os.environ.setdefault("SSL_CERT_FILE", certifi.where())
except ImportError:
    pass

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "songs.json"
AUDIO_EXT = ".mp3" if shutil.which("ffmpeg") else ".m4a"


def download_one(song: dict, outfile: Path) -> bool:
    stem = outfile.with_suffix("")
    queries = [
        song.get("youtube", ""),
        f"ytsearch1:{song['nameEn']} {song['movie']} song",
        f"ytsearch1:{song['nameHi']} {song['movie']}",
    ]

    for source in queries:
        if not source:
            continue
        if AUDIO_EXT == ".mp3":
            cmd = [
                "yt-dlp",
                "--extract-audio",
                "--audio-format",
                "mp3",
                "--audio-quality",
                "5",
                "--no-playlist",
                "-o",
                f"{stem}.%(ext)s",
                source,
            ]
        else:
            cmd = [
                "yt-dlp",
                "-f",
                "bestaudio[ext=m4a]/bestaudio/best",
                "--no-playlist",
                "-o",
                f"{stem}.%(ext)s",
                source,
            ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0 and outfile.exists():
            return True
        # yt-dlp may save with different ext before rename
        for f in stem.parent.glob(stem.name + ".*"):
            if f.suffix in {".m4a", ".mp3", ".webm", ".opus"}:
                if f != outfile:
                    f.rename(outfile)
                return True

    if result.returncode != 0:
        print(result.stderr[-400:] if result.stderr else "Unknown error", file=sys.stderr)
    return False


def main() -> int:
    if not shutil.which("yt-dlp"):
        print("Install yt-dlp: pip install yt-dlp")
        return 1

    if not shutil.which("ffmpeg"):
        print("Note: ffmpeg not found — saving as .m4a (plays fine in browsers).")
        print("For mp3: brew install ffmpeg, then re-run.\n")

    payload = json.loads(DATA.read_text(encoding="utf-8"))
    songs = payload["songs"]
    total = len(songs)

    for i, song in enumerate(songs, 1):
        slug = Path(song["audio"]).stem
        outfile = ROOT / "audio" / f"{slug}{AUDIO_EXT}"
        song["audio"] = f"audio/{outfile.name}"

        if outfile.exists():
            print(f"[{i}/{total}] Skip (exists): {outfile.name}")
            continue

        print(f"[{i}/{total}] Downloading: {song['nameEn']} -> {outfile.name}")
        if not download_one(song, outfile):
            print(f"  Failed all sources for: {song['nameEn']}", file=sys.stderr)
            return 1

    DATA.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\nUpdated {DATA.name} with audio paths ({AUDIO_EXT})")
    print(f"Done! {total} songs in {ROOT / 'audio'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
