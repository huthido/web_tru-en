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

import hashlib
import logging
import os
import re
import subprocess
import tempfile
import threading
import urllib.request
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

# Voice cloning: cache clip mẫu đã tải + tên giọng đã đăng ký với model.
# Key = sha256(ref_audio_url) → clip đổi URL (upload mới) là key mới.
REF_CACHE = Path(os.environ.get("HF_HOME", tempfile.gettempdir())) / "ref-cache"
REF_MAX_BYTES = 20 * 1024 * 1024
_ref_voice_names: dict[str, str | None] = {}


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
    # URL clip mẫu giọng tác giả (3–10s) — có thì clone giọng này, bỏ qua voice.
    ref_audio_url: str | None = None


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


def get_ref_wav(url: str) -> tuple[Path, str]:
    """Tải clip mẫu giọng về cache, chuẩn hoá wav mono 24kHz tối đa 10s.

    Trả (đường dẫn wav, cache key). Cache theo sha256(url) — tác giả upload
    clip mới là URL mới nên không cần invalidation.
    """
    key = hashlib.sha256(url.encode()).hexdigest()[:32]
    REF_CACHE.mkdir(parents=True, exist_ok=True)
    wav = REF_CACHE / f"{key}.wav"
    if wav.exists():
        return wav, key

    raw = REF_CACHE / f"{key}.src"
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            data = resp.read(REF_MAX_BYTES + 1)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Cannot download reference clip: {e}")
    if len(data) > REF_MAX_BYTES:
        raise HTTPException(status_code=400, detail="Reference clip too large (>20MB)")
    raw.write_bytes(data)

    result = subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(raw), "-t", "10", "-ac", "1", "-ar", "24000", str(wav),
        ],
        capture_output=True,
        text=True,
    )
    raw.unlink(missing_ok=True)
    if result.returncode != 0 or not wav.exists():
        log.error("ffmpeg ref decode failed: %s", result.stderr[-500:])
        raise HTTPException(status_code=400, detail="Cannot decode reference clip")
    return wav, key


def ensure_ref_voice(ref_wav: Path, key: str) -> str | None:
    """Đăng ký giọng clone với model 1 lần (add_voice) để các chunk sau dùng
    lại theo tên — nhanh hơn encode lại clip mẫu mỗi chunk. Version SDK không
    có add_voice thì trả None (fallback truyền ref_audio từng chunk)."""
    if key in _ref_voice_names:
        return _ref_voice_names[key]
    name = f"ref-{key[:16]}"
    try:
        _model.add_voice(name, str(ref_wav))
        _ref_voice_names[key] = name
    except Exception as e:
        log.warning("add_voice failed (%s) — passing ref_audio per chunk", e)
        _ref_voice_names[key] = None
    return _ref_voice_names[key]


def infer_chunk(text: str, voice: str | None, ref_wav: Path | None = None,
                ref_voice_name: str | None = None):
    """Gọi VieNeu infer, chịu được khác biệt signature giữa các version.

    Ưu tiên: giọng clone đã đăng ký > clip mẫu trực tiếp > giọng preset > mặc định.
    """
    if ref_voice_name:
        try:
            return _model.infer(text, voice=ref_voice_name)
        except Exception as e:
            log.warning("infer with registered ref voice failed (%s)", e)
    if ref_wav is not None:
        try:
            return _model.infer(text, ref_audio=str(ref_wav))
        except TypeError:
            log.warning("Model does not accept ref_audio kwarg — falling back to preset voice")
    if voice:
        try:
            return _model.infer(text, voice=voice)
        except TypeError:
            log.warning("Model does not accept voice kwarg — falling back to default voice")
    return _model.infer(text)


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": _model is not None}


@app.get("/voices")
def voices():
    """Danh sách giọng preset của model — backend cache và đưa cho tác giả chọn."""
    if _model is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")
    try:
        items = _model.list_preset_voices()
    except Exception as e:
        log.warning("list_preset_voices failed: %s", e)
        return {"voices": []}
    result = []
    for item in items:
        # SDK trả (label, voice_id); phòng version trả string đơn.
        if isinstance(item, (list, tuple)) and len(item) >= 2:
            result.append({"label": str(item[0]), "id": str(item[1])})
        else:
            result.append({"label": str(item), "id": str(item)})
    return {"voices": result}


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

    # Voice cloning: tải + chuẩn hoá clip mẫu, đăng ký giọng với model.
    ref_wav: Path | None = None
    ref_voice_name: str | None = None
    if req.ref_audio_url:
        ref_wav, ref_key = get_ref_wav(req.ref_audio_url)

    log.info(
        "Synthesizing %d chars in %d chunks (voice=%s, cloned=%s)",
        len(text), len(chunks), voice or "default", bool(ref_wav),
    )

    with _infer_lock, tempfile.TemporaryDirectory(prefix="tts-") as tmp:
        if ref_wav is not None:
            ref_voice_name = ensure_ref_voice(ref_wav, ref_key)
        tmp_path = Path(tmp)
        wav_files: list[Path] = []
        for i, chunk in enumerate(chunks):
            audio = infer_chunk(chunk, voice, ref_wav, ref_voice_name)
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
