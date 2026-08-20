# TTS Worker (VieNeu-TTS)

Service Python sinh audio MP3 tiếng Việt từ nội dung chương, dùng
[VieNeu-TTS](https://github.com/pnnbao97/VieNeu-TTS) (Apache 2.0). Backend
NestJS gọi qua HTTP (`POST /synthesize`), nhận MP3 rồi upload lên Garage và
lưu vào `Chapter.ttsAudioUrl` — mỗi chương chỉ sinh **một lần**, cache vĩnh viễn.

## Chạy bằng Docker (khuyên dùng)

```bash
docker build -t web-truyen-tts-worker services/tts-worker
docker run -d --name tts-worker \
  -p 8000:8000 \
  -v tts_models:/models \
  -e TTS_API_KEY=doi-thanh-secret-cua-ban \
  web-truyen-tts-worker
```

Lần chạy đầu sẽ tải model checkpoint (vài GB) về volume `/models` — các lần
sau khởi động nhanh. RAM khuyến nghị ≥ 4GB cho container.

Trong `docker-compose.yaml` đã có sẵn service `tts-worker` (profile `tts`):

```bash
docker compose --profile tts up -d tts-worker
```

## Chạy native (dev)

```bash
cd services/tts-worker
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn main:app --port 8000
```

## Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `TTS_API_KEY` | (rỗng = không auth) | Header `X-Api-Key` backend phải gửi kèm |
| `TTS_DEFAULT_VOICE` | (mặc định của model) | Tên giọng VieNeu (vd `Adam`) |
| `TTS_CHUNK_CHARS` | `400` | Độ dài mỗi đoạn khi cắt câu |
| `TTS_MAX_CHARS` | `200000` | Chặn text quá dài |
| `TTS_MP3_BITRATE` | `64k` | Bitrate MP3 đầu ra (mono) |

## Cấu hình backend

Backend bật tính năng khi có biến:

```
TTS_WORKER_URL=http://tts-worker:8000    # hoặc http://localhost:8000 khi dev native
TTS_WORKER_API_KEY=doi-thanh-secret-cua-ban
TTS_WORKER_VOICE=                        # tuỳ chọn, để trống dùng giọng mặc định
TTS_WORKER_TIMEOUT_MS=1200000            # tuỳ chọn, mặc định 20 phút
```

Thiếu `TTS_WORKER_URL` → backend trả 503 cho POST `/chapters/:id/tts` và
frontend tự ẩn nút "Tạo giọng đọc AI".

## API

- `GET /health` → `{"status":"ok","model_loaded":true}`
- `GET /voices` → `{"voices":[{"label":"Adam (Nam Bộ)","id":"Adam"},...]}` —
  danh sách giọng preset của model (backend cache 1h cho tác giả chọn).
- `POST /synthesize` body `{"text":"...","voice":"Adam","ref_audio_url":null}`
  → binary `audio/mpeg`. Với chương ~10 phút audio, CPU mất cỡ 4–6 phút (RTF < 1).
  - `ref_audio_url`: URL clip mẫu giọng tác giả (3–10s) — worker tải về,
    chuẩn hoá wav mono 24kHz (cache theo sha256 URL trong `$HF_HOME/ref-cache`)
    và **clone giọng** đó, bỏ qua `voice`.
  - Tag biểu cảm trong text (v3 Turbo, experimental): `[cười]`, `[thở dài]`,
    `[hắng giọng]` — giữ nguyên khi gửi sang, model tự diễn.
