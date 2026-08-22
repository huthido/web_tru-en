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

import asyncio
import gc
import hashlib
import ipaddress
import logging
import os
import re
import resource
import socket
import subprocess
import tempfile
import threading
import time
import urllib.request
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urlparse

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Request
from starlette.concurrency import run_in_threadpool
from fastapi.responses import Response
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("tts-worker")

API_KEY = os.environ.get("TTS_API_KEY", "")
DEFAULT_VOICE = os.environ.get("TTS_DEFAULT_VOICE", "")
MAX_CHARS = int(os.environ.get("TTS_MAX_CHARS", "200000"))
CHUNK_CHARS = int(os.environ.get("TTS_CHUNK_CHARS", "400"))
MP3_BITRATE = os.environ.get("TTS_MP3_BITRATE", "64k")
# RSS (MB) vượt ngưỡng này → process tự thoát SAU khi trả xong response và
# không còn request nào đang chạy; Docker restart lại trong ~15s (model nạp
# 10s). Lý do: ONNX/glibc giữ bộ nhớ tăng dần theo số chương đã sinh
# (0.6GB → 4GB sau vài chục chương) rồi bị cgroup OOM-kill GIỮA job → mọi
# request đang gửi tới worker fail cùng lúc. Tự recycle chủ động rẻ hơn nhiều.
MAX_RSS_MB = int(os.environ.get("TTS_MAX_RSS_MB", "3000"))

_model = None
# VieNeu infer không chắc thread-safe — serialize mọi request sinh audio.
_infer_lock = threading.Lock()
_inflight = 0
_inflight_lock = threading.Lock()


def current_rss_mb() -> float:
    try:
        with open("/proc/self/statm") as f:
            pages = int(f.read().split()[1])
        return pages * resource.getpagesize() / 1024 / 1024
    except Exception:
        # ru_maxrss (Linux: KB) là đỉnh, vẫn đủ để quyết định recycle.
        return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024


def _maybe_recycle():
    """Chạy sau khi response đã gửi xong (BackgroundTasks)."""
    gc.collect()
    rss = current_rss_mb()
    with _inflight_lock:
        busy = _inflight
    if rss > MAX_RSS_MB and busy == 0:
        log.warning(
            "RSS %.0f MB > %d MB và không còn request — tự thoát để Docker khởi động lại",
            rss, MAX_RSS_MB,
        )
        os._exit(0)
    log.info("RSS %.0f MB (ngưỡng recycle %d MB, inflight %d)", rss, MAX_RSS_MB, busy)

# Voice cloning: cache clip mẫu đã tải + tên giọng đã đăng ký với model.
# Key = sha256(ref_audio_url) → clip đổi URL (upload mới) là key mới.
REF_CACHE = Path(os.environ.get("HF_HOME", tempfile.gettempdir())) / "ref-cache"
REF_MAX_BYTES = 20 * 1024 * 1024
_ref_voice_names: dict[str, str | None] = {}

# Chống SSRF: ref_audio_url chỉ được là http/https tới host PUBLIC (URL Garage
# CDN do backend đưa sang). Dev native dùng http://localhost/uploads/... thì
# bật TTS_ALLOW_PRIVATE_REF_URLS=1.
ALLOW_PRIVATE_REF = os.environ.get("TTS_ALLOW_PRIVATE_REF_URLS", "") == "1"


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """Không theo redirect — tránh URL public trả 302 trỏ vào host nội bộ."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


_ref_opener = urllib.request.build_opener(_NoRedirect)


def validate_ref_url(url: str) -> None:
    """Chặn scheme khác http/https và host phân giải ra IP private/loopback.

    Lưu ý: check lúc resolve, không chống được DNS rebinding hoàn toàn —
    lớp bảo vệ chính vẫn là TTS_API_KEY + không expose port ra ngoài.
    """
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise HTTPException(status_code=400, detail="Invalid reference clip URL")
    if ALLOW_PRIVATE_REF:
        return
    try:
        infos = socket.getaddrinfo(parsed.hostname, None)
    except socket.gaierror:
        raise HTTPException(status_code=400, detail="Invalid reference clip URL")
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if (
            ip.is_private or ip.is_loopback or ip.is_link_local
            or ip.is_reserved or ip.is_multicast or ip.is_unspecified
        ):
            raise HTTPException(status_code=400, detail="Invalid reference clip URL")


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

    validate_ref_url(url)
    raw = REF_CACHE / f"{key}.src"
    try:
        with _ref_opener.open(url, timeout=30) as resp:
            data = resp.read(REF_MAX_BYTES + 1)
    except HTTPException:
        raise
    except Exception as e:
        # Log chi tiết server-side; response chỉ trả lỗi chung (không echo
        # exception — tránh lộ thông tin nội bộ qua thông báo lỗi).
        log.warning("Cannot download reference clip: %s", e)
        raise HTTPException(status_code=400, detail="Cannot download reference clip")
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
async def synthesize(
    req: SynthesizeRequest,
    request: Request,
    background: BackgroundTasks,
    x_api_key: str | None = Header(default=None),
    x_timeout_ms: int | None = Header(default=None),
):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    if _model is None:
        raise HTTPException(status_code=503, detail="Model not loaded yet")

    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty text")
    if len(text) > MAX_CHARS:
        raise HTTPException(status_code=413, detail=f"Text too long (>{MAX_CHARS} chars)")

    global _inflight
    with _inflight_lock:
        _inflight += 1
    background.add_task(_maybe_recycle)

    # Client ngắt kết nối (backend chết/timeout/script bị kill) → đặt cờ huỷ để
    # luồng sinh audio dừng ở chunk kế tiếp (hoặc không lấy lock nữa nếu đang
    # xếp hàng), thay vì chạy tiếp tới deadline và chặn các request thật phía sau.
    cancel = threading.Event()

    async def watch_disconnect():
        while not cancel.is_set():
            try:
                if await request.is_disconnected():
                    log.warning("Client disconnected — huỷ sinh audio (%d chars)", len(text))
                    cancel.set()
                    return
            except Exception:
                return
            await asyncio.sleep(2)

    watcher = asyncio.create_task(watch_disconnect())
    try:
        return await run_in_threadpool(_synthesize, req, text, x_timeout_ms, cancel)
    finally:
        cancel.set()
        watcher.cancel()
        with _inflight_lock:
            _inflight -= 1


def _synthesize(
    req: SynthesizeRequest, text: str, x_timeout_ms: int | None, cancel: threading.Event
) -> Response:
    voice = req.voice or DEFAULT_VOICE or None
    chunks = split_chunks(text)
    # Hạn chót client còn chờ (tính từ lúc nhận request, gồm cả thời gian xếp
    # hàng sau _infer_lock). Quá hạn thì dừng — client đã bỏ, sinh tiếp vô ích.
    deadline = (time.monotonic() + x_timeout_ms / 1000.0) if x_timeout_ms else None

    def check_deadline(stage: str):
        if cancel.is_set():
            log.warning("Client gone at %s — aborting (%d chars)", stage, len(text))
            raise HTTPException(status_code=499, detail="Client disconnected")
        if deadline is not None and time.monotonic() > deadline:
            log.warning("Client deadline passed at %s — aborting (%d chars)", stage, len(text))
            raise HTTPException(status_code=504, detail="Client deadline passed")

    # Voice cloning: tải + chuẩn hoá clip mẫu, đăng ký giọng với model.
    ref_wav: Path | None = None
    ref_key: str | None = None
    if req.ref_audio_url:
        ref_wav, ref_key = get_ref_wav(req.ref_audio_url)

    log.info(
        "Synthesizing %d chars in %d chunks (voice=%s, cloned=%s)",
        len(text), len(chunks), voice or "default", bool(ref_wav),
    )

    # Xếp hàng lấy lock theo từng giây để request đã bị huỷ/quá hạn không
    # chiếm lượt sinh của người khác.
    while not _infer_lock.acquire(timeout=1.0):
        check_deadline("queue")
    try:
        return _synthesize_locked(text, chunks, voice, ref_wav, ref_key, check_deadline)
    finally:
        _infer_lock.release()


def _synthesize_locked(text, chunks, voice, ref_wav, ref_key, check_deadline) -> Response:
    ref_voice_name: str | None = None
    with tempfile.TemporaryDirectory(prefix="tts-") as tmp:
        check_deadline("queue")
        if ref_wav is not None:
            ref_voice_name = ensure_ref_voice(ref_wav, ref_key)
        tmp_path = Path(tmp)
        wav_files: list[Path] = []
        started = time.monotonic()
        for i, chunk in enumerate(chunks):
            check_deadline(f"chunk {i + 1}/{len(chunks)}")
            audio = infer_chunk(chunk, voice, ref_wav, ref_voice_name)
            wav = tmp_path / f"chunk-{i:04d}.wav"
            _model.save(audio, str(wav))
            wav_files.append(wav)
            if (i + 1) % 10 == 0 or i + 1 == len(chunks):
                log.info("  chunk %d/%d done (%.0fs)", i + 1, len(chunks), time.monotonic() - started)

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
