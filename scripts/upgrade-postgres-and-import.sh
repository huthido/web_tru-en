#!/usr/bin/env bash
# Nâng Postgres container 16 -> 18 (wipe volume, fresh init) rồi import backup.sql.
# Chỉ dùng khi DB đang trống / data có thể tái tạo từ backup.sql.
# Usage:
#   ./scripts/upgrade-postgres-and-import.sh                # interactive
#   ./scripts/upgrade-postgres-and-import.sh --force
#   COMPOSE_PROJECT=myproject ./scripts/upgrade-postgres-and-import.sh

set -euo pipefail

FORCE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE=1 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
  shift
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PROJECT="${COMPOSE_PROJECT:-$(basename "$REPO_ROOT" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]//g')}"
VOLUME="${PROJECT}_postgres_data"

step() { printf '\033[36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[32m    %s\033[0m\n' "$*"; }
die()  { printf '\033[31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

step "Phát hiện volume cần wipe: $VOLUME"
if ! docker volume ls --format '{{.Name}}' | grep -qx "$VOLUME"; then
  printf '\033[33m    Volume "%s" không tồn tại. Volumes có chứa postgres:\033[0m\n' "$VOLUME"
  docker volume ls --format '{{.Name}}' | grep postgres || true
  die "Truyền COMPOSE_PROJECT=<tên> đúng."
fi

if [[ $FORCE -ne 1 ]]; then
  read -r -p "Xác nhận: STOP postgres/pgbouncer/backend/frontend + XOÁ volume $VOLUME? [y/N] " ans
  [[ "$ans" =~ ^[yY]$ ]] || die 'Aborted.'
fi

step '1. Stop services phụ thuộc Postgres'
docker compose stop frontend backend pgbouncer postgres

step "2. Xoá volume $VOLUME"
docker volume rm "$VOLUME" >/dev/null
ok 'xong'

step '3. Start postgres (image postgres:18-alpine init lần đầu)'
docker compose up -d postgres

step '4. Đợi postgres healthy...'
for i in $(seq 1 30); do
  status=$(docker inspect --format '{{.State.Health.Status}}' web_truyen_postgres 2>/dev/null || echo none)
  [[ "$status" == 'healthy' ]] && break
  sleep 2
done
[[ "$status" == 'healthy' ]] || die "Postgres không healthy sau 60s (status: $status)"
ok 'healthy'

version=$(docker exec web_truyen_postgres psql -U "${POSTGRES_USER:-user}" -d "${POSTGRES_DB:-web_truyen_db}" -tAc 'SHOW server_version;')
ok "server_version: $version"

step '5. Khởi động pgbouncer'
docker compose up -d pgbouncer

step '6. Chạy import-backup.sh --skip-pre-backup --force'
bash "$(dirname "$0")/import-backup.sh" --skip-pre-backup --force

echo ''
echo -e '\033[32mHOÀN TẤT. Postgres đã nâng lên 18 + data đã restore từ backup.sql\033[0m'
echo 'Bước tiếp: docker compose up -d backend frontend'
