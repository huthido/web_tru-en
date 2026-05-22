#!/usr/bin/env bash
# =====================================================================
# Thiết lập Garage cho chế độ `pnpm docker:local`.
# =====================================================================
# Garage cần được gán "layout" ở lần chạy đầu — trước đó /health trả lỗi
# nên container đứng ở trạng thái "unhealthy" dù vẫn chạy. Script này
# gán layout 1 node + tạo bucket -> Garage chuyển sang "healthy".
#
# Idempotent: chạy lại nhiều lần không gây hại (tự bỏ qua bước đã xong).
#
# Dùng:  pnpm docker:local        (dựng stack)
#        pnpm docker:local:setup  (chạy script này — MỘT LẦN là đủ)
# =====================================================================
set -uo pipefail

# Git-bash trên Windows tự đổi "/usr/..." thành "C:/Program Files/Git/usr/..."
# khi truyền vào docker exec. Tắt path-conversion để giữ nguyên đối số.
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*'

GC=web_truyen_garage
# Dùng `garage` (bare — đã nằm trong PATH của container) thay vì đường dẫn
# tuyệt đối, tránh bị git-bash mangle.
G="docker exec $GC garage"

echo "==> Thiết lập Garage ($GC)..."

# --- Container phải đang chạy ---
if ! docker ps --format '{{.Names}}' | grep -qx "$GC"; then
  echo "✗ Container $GC chưa chạy. Hãy chạy 'pnpm docker:local' trước."
  exit 1
fi

# --- Chờ Garage RPC sẵn sàng (tối đa ~60s) ---
echo "==> Chờ Garage phản hồi..."
for _ in $(seq 1 30); do
  $G status >/dev/null 2>&1 && break
  sleep 2
done
if ! $G status >/dev/null 2>&1; then
  echo "✗ Garage không phản hồi. Xem log: docker logs $GC"
  exit 1
fi

# --- 1. Gán + áp layout (bỏ qua nếu đã có) ---
if $G layout show 2>/dev/null | grep -qE 'version: *[1-9]'; then
  echo "==> Layout đã tồn tại — bỏ qua."
else
  NODE=$($G node id -q 2>/dev/null | cut -d'@' -f1)
  if [ -z "${NODE:-}" ]; then
    echo "✗ Không lấy được node id của Garage."
    exit 1
  fi
  echo "==> Gán layout cho node ${NODE:0:16}…"
  $G layout assign "$NODE" -z dc1 -c 1G
  $G layout apply --version 1
  echo "==> Đã áp layout."
fi

# --- 2. Tạo bucket (idempotent) ---
if $G bucket list 2>/dev/null | grep -q 'web-truyen'; then
  echo "==> Bucket 'web-truyen' đã có."
else
  $G bucket create web-truyen >/dev/null && echo "==> Đã tạo bucket 'web-truyen'."
fi

echo ""
echo "✓ Garage sẵn sàng — container sẽ chuyển 'healthy' sau ~30s."
echo ""
echo "  Mặc định backend dùng lưu trữ LOCAL (volume backend_uploads) — đủ"
echo "  để chạy/thử ở máy local. Muốn backend dùng Garage S3 thì tạo key:"
echo "      docker exec $GC garage key create web-truyen-app"
echo "  rồi điền vào .env: S3_ENDPOINT=http://garage:3900 + S3_ACCESS_KEY"
echo "  + S3_SECRET_KEY + S3_BUCKET=web-truyen, và chạy lại 'pnpm docker:local'."
