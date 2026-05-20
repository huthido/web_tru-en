#!/usr/bin/env bash
# Import backup.sql (Neon pg_dump v18) vào Postgres container của docker-compose.
# Linux/macOS version song song với scripts/import-backup.ps1.
#
# Usage:
#   ./scripts/import-backup.sh                # interactive, có pg_dump phòng rollback
#   ./scripts/import-backup.sh --skip-pre-backup --force
#
# Env override: POSTGRES_USER, POSTGRES_DB, CONTAINER, BACKUP_FILE.

set -euo pipefail

CONTAINER="${CONTAINER:-web_truyen_postgres}"
USER_NAME="${POSTGRES_USER:-user}"
DATABASE="${POSTGRES_DB:-web_truyen_db}"
BACKUP_FILE="${BACKUP_FILE:-backup.sql}"
BASELINE='20260205155753_init_fix'

SKIP_PRE_BACKUP=0
FORCE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-pre-backup) SKIP_PRE_BACKUP=1 ;;
    --force)           FORCE=1 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
  shift
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_PATH="$REPO_ROOT/$BACKUP_FILE"
TMP_DIR="$REPO_ROOT/tmp"
CLEAN_PATH="$TMP_DIR/backup_clean.sql"
PRE_DUMP="$REPO_ROOT/pre_import_backup_$(date +%Y%m%d_%H%M%S).sql"
BACKEND_DIR="$REPO_ROOT/apps/backend"

step() { printf '\033[36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[32m    %s\033[0m\n' "$*"; }
warn() { printf '\033[33m    %s\033[0m\n' "$*"; }
die()  { printf '\033[31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

confirm() {
  [[ $FORCE -eq 1 ]] && return 0
  read -r -p "$1 [y/N] " ans
  [[ "$ans" =~ ^[yY]$ ]] || die 'Aborted.'
}

# --- Pre-flight ----------------------------------------------------------
step 'Pre-flight check'
[[ -f "$BACKUP_PATH" ]] || die "Không tìm thấy backup: $BACKUP_PATH"
docker ps --filter "name=^/${CONTAINER}$" --format '{{.Names}}' | grep -q "$CONTAINER" \
  || die "Container '$CONTAINER' không chạy. Khởi động: docker compose up -d postgres"
ok "backup: $BACKUP_PATH ($(du -h "$BACKUP_PATH" | cut -f1))"
ok "container: $CONTAINER | user: $USER_NAME | db: $DATABASE"

# --- 1. Pre-process ------------------------------------------------------
step '1. Pre-process backup.sql -> tmp/backup_clean.sql'
mkdir -p "$TMP_DIR"
sed -E \
  -e '/^\\(restrict|unrestrict)\s/d' \
  -e '/^SET transaction_timeout = [0-9]+;/d' \
  -e '/^ALTER DEFAULT PRIVILEGES FOR ROLE (cloud_admin|neon_superuser)/d' \
  -e "s/neondb_owner/\"${USER_NAME}\"/g" \
  "$BACKUP_PATH" > "$CLEAN_PATH"
ok "tạo $CLEAN_PATH ($(du -h "$CLEAN_PATH" | cut -f1))"

# --- 2. Pre-import safety dump ------------------------------------------
if [[ $SKIP_PRE_BACKUP -eq 0 ]]; then
  step '2. pg_dump DB hiện tại để rollback'
  docker exec "$CONTAINER" pg_dump -U "$USER_NAME" "$DATABASE" > "$PRE_DUMP"
  ok "snapshot: $PRE_DUMP"
else
  step '2. SKIP (DB đích đang trống)'
fi

# --- 3. Reset schema ----------------------------------------------------
step '3. DROP SCHEMA public CASCADE; CREATE SCHEMA public;  [DESTRUCTIVE]'
confirm "Xác nhận wipe schema 'public' trên DB '$DATABASE' ở container '$CONTAINER'?"
docker exec "$CONTAINER" psql -U "$USER_NAME" -d "$DATABASE" -v ON_ERROR_STOP=1 -c \
  "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO \"$USER_NAME\"; GRANT ALL ON SCHEMA public TO public;"
ok 'schema reset xong'

# --- 4. Import ----------------------------------------------------------
step '4. Copy + import backup_clean.sql'
docker cp "$CLEAN_PATH" "${CONTAINER}:/tmp/backup_clean.sql"
docker exec "$CONTAINER" psql -U "$USER_NAME" -d "$DATABASE" -v ON_ERROR_STOP=1 -f /tmp/backup_clean.sql
docker exec "$CONTAINER" rm -f /tmp/backup_clean.sql
ok 'import thành công'

# --- 5. Post-import cleanup --------------------------------------------
step '5. Reset _prisma_migrations + drop comment_likes (orphan)'
docker exec "$CONTAINER" psql -U "$USER_NAME" -d "$DATABASE" -v ON_ERROR_STOP=1 -c \
  "DELETE FROM _prisma_migrations; DROP TABLE IF EXISTS comment_likes CASCADE;"
ok 'cleanup xong'

# --- 6. Mark baseline applied ------------------------------------------
step "6. prisma migrate resolve --applied $BASELINE"
cd "$BACKEND_DIR"
npx prisma migrate resolve --applied "$BASELINE"
ok "$BASELINE đã được mark applied"

# --- 7. Apply remaining migrations -------------------------------------
step '7. prisma migrate deploy (15 migration còn lại)'
npx prisma migrate deploy
ok 'tất cả migration đã apply'

# --- 8. Verify ---------------------------------------------------------
step '8. Verify migrate status'
npx prisma migrate status

echo ''
echo -e '\033[32mHOÀN TẤT.\033[0m'
echo "  - backup_clean.sql: $CLEAN_PATH (có thể xoá)"
[[ $SKIP_PRE_BACKUP -eq 0 ]] && echo "  - rollback dump:    $PRE_DUMP"
echo "  - Spot-check: docker exec -it $CONTAINER psql -U $USER_NAME -d $DATABASE -c 'SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM stories; SELECT COUNT(*) FROM chapters;'"
