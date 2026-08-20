"""VieNeu-TTS worker — sinh audio MP3 từ text tiếng Việt cho backend web_truyen.

API:
    GET  /health                → {"status": "ok", "model_loaded": bool}
    POST /synthesize            → audio/mpeg (toàn bộ file MP3)
         body: {"text": "...", "voice": "..." (tuỳ chọn)}
         header: X-Api-Key (bắt buộc nếu env TTS_API_KEY được set)

Model nạp MỘT lần lúc startup (tải checkpoint về HF cache ở lần chạy đầu).
Text dài được cắt theo câu thành đoạn ~400 ký tự, sinh tuần tự rồi ghép và
encode MP3 bằng ffmpeg — VieNeu ổn định nhất với đoạn ngắn, và cách này cho
progress log rõ ràng khi chương dài.
"""

import logging
import os
import re
import subprocess
import tempfile
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("tts-worker")

API_KEY = os.environ.get("TTS_API_KEY", "")
DEFAULT_VOICE = os.environ.get("TTS_DEFAULT_VOICE", "")
MAX_CHARS = int(os.environ.get("TTS_MAX_CHARS", "200000"))
CHUNK_CHARS = int(os.environ.get("TTS_CHUNK_CHARS", "400"))
MP3_BITRATE = os.environ.get("TTS_MP3_BITRATE", "64k")

_model = None
# VieNeu infer không chắc thread-safe — serialize mọi request sinh audio.
_infer_lock = threading.Lock()


def _load_model():
    global _model
    from vieneu import Vieneu  # import trễ: nặng, chỉ cần trong process serve

    log.info("Loading VieNeu-TTS model (first run downloads the checkpoint)...")
    _model = Vieneu()
    log.info("VieNeu-TTS model ready")


@asynccontextmanager
async def lifespan(app: FastAPI):
    _load_model()
    yield


app = FastAPI(title="VieNeu-TTS worker", lifespan=lifespan)


class SynthesizeRequest(BaseModel):
    text: str
    voice: str | None = None


def split_chunks(text: str, max_len: int = CHUNK_CHARS) -> list[str]:
    """Cắt theo câu, gộp tới ~max_len ký tự; câu đơn quá dài thì cắt cứng."""
    sentences = re.findall(r"[^.!?…\n]+[.!?…]*\s*", text) or [text]
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        if current and len(current) + len(sentence) + 1 > max_len:
            chunks.append(current)
            current = sentence
        else:
            current = f"{current} {sentence}" if current else sentence
        while len(current) > max_len:
            chunks.append(current[:max_len])
            current = current[max_len:]
    if current.strip():
        chunks.append(current.strip())
    return chunks


def infer_chunk(text: str, voice: str | None):
    """Gọi VieNeu infer, chịu được khác biệt signature giữa các version."""
    if voice:
        try:
            return _model.infer(text, voice=voice)
        except TypeError:
            log.warning("Model does not accept voice kwarg — falling back to default voice")
    return _model.infer(text)


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": _model is not None}


@app.post("/synthesize")
def synthesize(req: SynthesizeRequest, x_api_key: str | None = Header(default=None)):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    if _model is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty text")
    if len(text) > MAX_CHARS:
        raise HTTPException(status_code=413, detail=f"Text too long (>{MAX_CHARS} chars)")

    voice = req.voice or DEFAULT_VOICE or None
    chunks = split_chunks(text)
    log.info("Synthesizing %d chars in %d chunks (voice=%s)", len(text), len(chunks), voice or "default")

    with _infer_lock, tempfile.TemporaryDirectory(prefix="tts-") as tmp:
        tmp_path = Path(tmp)
        wav_files: list[Path] = []
        for i, chunk in enumerate(chunks):
            audio = infer_chunk(chunk, voice)
            wav = tmp_path / f"chunk-{i:04d}.wav"
            _model.save(audio, str(wav))
            wav_files.append(wav)
            if (i + 1) % 10 == 0 or i + 1 == len(chunks):
                log.info("  chunk %d/%d done", i + 1, len(chunks))

        # Ghép các wav (cùng format vì cùng model) và encode MP3 mono.
        concat_list = tmp_path / "list.txt"
        concat_list.write_text(
            "".join(f"file '{w.as_posix()}'\n" for w in wav_files), encoding="utf-8"
        )
        mp3 = tmp_path / "out.mp3"
        result = subprocess.run(
            [
                "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                "-f", "concat", "-safe", "0", "-i", str(concat_list),
                "-ac", "1", "-b:a", MP3_BITRATE, str(mp3),
            ],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            log.error("ffmpeg failed: %s", result.stderr[-1000:])
            raise HTTPException(status_code=500, detail="Audio encoding failed")

        data = mp3.read_bytes()

    log.info("Done: %.1f MB MP3", len(data) / 1024 / 1024)
    return Response(content=data, media_type="audio/mpeg")
