# VieNeu-TTS worker — CPU inference (ONNX). Model checkpoint tải về
# /models (HF cache) ở lần khởi động đầu → mount volume để không tải lại.
FROM python:3.11-slim

# ffmpeg: ghép wav + encode MP3. espeak-ng: một số phonemizer cần.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg espeak-ng git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# HF cache — mount volume vào /models để giữ checkpoint giữa các lần deploy.
ENV HF_HOME=/models
VOLUME /models

EXPOSE 8000

# workers=1: model chiếm RAM lớn, nhiều worker = nhân đôi RAM; concurrency
# đã được backend giới hạn (BullMQ concurrency 1).
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
