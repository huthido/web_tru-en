<#
.SYNOPSIS
  Import backup.sql (Neon pg_dump v18) vào Postgres container của docker-compose.

.DESCRIPTION
  Tự động hoá 8 bước:
    1. Pre-process backup.sql -> tmp/backup_clean.sql
         * xoá \restrict / \unrestrict (PG18 only)
         * xoá SET transaction_timeout (PG17+ only)
         * replace owner neondb_owner -> $User
    2. (Skip nếu DB đang trống) pg_dump backup phòng rollback
    3. DROP SCHEMA public CASCADE; CREATE SCHEMA public;        [DESTRUCTIVE]
    4. docker cp backup_clean.sql + psql -f import
    5. Post-import SQL: DELETE FROM _prisma_migrations; DROP TABLE comment_likes;
    6. prisma migrate resolve --applied 20260205155753_init_fix
    7. prisma migrate deploy
    8. prisma migrate status

.PARAMETER Container
  Tên container postgres (default: web_truyen_postgres).

.PARAMETER User
  Postgres user (default: env POSTGRES_USER hoặc "user").

.PARAMETER Database
  Postgres DB (default: env POSTGRES_DB hoặc "web_truyen_db").

.PARAMETER BackupFile
  File backup gốc (default: ./backup.sql).

.PARAMETER SkipPreBackup
  Bỏ qua bước 2 (pg_dump phòng rollback). Dùng khi DB đích trống.

.PARAMETER Force
  Bỏ qua mọi prompt xác nhận (CI mode).

.EXAMPLE
  pwsh scripts/import-backup.ps1 -SkipPreBackup
  pwsh scripts/import-backup.ps1 -Force
#>

[CmdletBinding()]
param(
  [string]$Container    = 'web_truyen_postgres',
  [string]$User         = $(if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { 'user' }),
  [string]$Database     = $(if ($env:POSTGRES_DB)   { $env:POSTGRES_DB }   else { 'web_truyen_db' }),
  [string]$BackupFile   = 'backup.sql',
  [switch]$SkipPreBackup,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

# Resolve to absolute paths from repo root (script lives in scripts/).
$repoRoot   = Split-Path -Parent $PSScriptRoot
$backupPath = Join-Path $repoRoot $BackupFile
$tmpDir     = Join-Path $repoRoot 'tmp'
$cleanPath  = Join-Path $tmpDir   'backup_clean.sql'
$preDump    = Join-Path $repoRoot ('pre_import_backup_{0}.sql' -f (Get-Date -Format 'yyyyMMdd_HHmmss'))
$backendDir = Join-Path $repoRoot 'apps/backend'
$baseline   = '20260205155753_init_fix'

function Step([string]$msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Ok([string]$msg)   { Write-Host "    $msg" -ForegroundColor Green }
function Warn([string]$msg) { Write-Host "    $msg" -ForegroundColor Yellow }
function Confirm-Or-Exit([string]$question) {
  if ($Force) { return }
  $ans = Read-Host "$question [y/N]"
  if ($ans -notmatch '^[yY]') { Write-Host 'Aborted.' -ForegroundColor Red; exit 1 }
}

# --- Pre-flight checks ----------------------------------------------------
Step 'Pre-flight check'
if (-not (Test-Path $backupPath)) {
  throw "Không tìm thấy backup file: $backupPath"
}
$running = docker ps --filter "name=^/$Container$" --format '{{.Names}}' 2>$null
if (-not $running) {
  throw "Container '$Container' không chạy. Khởi động bằng: docker compose up -d postgres"
}
Ok "backup: $backupPath ($([math]::Round((Get-Item $backupPath).Length/1MB,2)) MB)"
Ok "container: $Container | user: $User | db: $Database"

# --- Step 1: Pre-process --------------------------------------------------
Step '1. Pre-process backup.sql -> tmp/backup_clean.sql'
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

$raw = [System.IO.File]::ReadAllText($backupPath, [System.Text.Encoding]::UTF8)

# Xoá \restrict / \unrestrict directive lines (PG18 only).
$raw = [regex]::Replace($raw, '(?m)^\\(restrict|unrestrict)\s.*\r?\n', '')
# Xoá SET transaction_timeout (PG17+ only — PG16 unknown parameter).
$raw = [regex]::Replace($raw, '(?m)^SET transaction_timeout = \d+;\s*\r?\n', '')
# Xoá ALTER DEFAULT PRIVILEGES tham chiếu Neon system roles (cloud_admin /
# neon_superuser) — chỉ tồn tại trên Neon platform, self-hosted không có.
$raw = [regex]::Replace($raw, '(?m)^ALTER DEFAULT PRIVILEGES FOR ROLE (cloud_admin|neon_superuser).*;\s*\r?\n', '')
# Replace ownership references — quote identifier vì 'user' là SQL reserved
# keyword (Postgres không parse được "OWNER TO user;" mà cần "OWNER TO ""user"";").
# Quote dạng "name" an toàn cho mọi tên (kể cả tên không reserved).
$quoted = '"' + $User + '"'
$raw = $raw.Replace('neondb_owner', $quoted)

# Write UTF8 without BOM (psql expects no BOM).
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($cleanPath, $raw, $utf8NoBom)
Ok "tạo $cleanPath ($([math]::Round((Get-Item $cleanPath).Length/1MB,2)) MB)"

# --- Step 2: Pre-import safety backup ------------------------------------
if (-not $SkipPreBackup) {
  Step '2. pg_dump DB hiện tại để rollback'
  docker exec $Container pg_dump -U $User $Database > $preDump
  Ok "snapshot: $preDump"
} else {
  Step '2. SKIP (DB đích đang trống)'
}

# --- Step 3: Reset schema ------------------------------------------------
Step "3. DROP SCHEMA public CASCADE; CREATE SCHEMA public;  [DESTRUCTIVE]"
Confirm-Or-Exit "Xác nhận wipe schema 'public' trên DB '$Database' ở container '$Container'?"
docker exec $Container psql -U $User -d $Database -v ON_ERROR_STOP=1 -c `
  "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO `"$User`"; GRANT ALL ON SCHEMA public TO public;"
if ($LASTEXITCODE -ne 0) { throw "DROP SCHEMA thất bại (exit $LASTEXITCODE)" }
Ok 'schema reset xong'

# --- Step 4: Import backup_clean.sql -------------------------------------
Step '4. Copy + import backup_clean.sql vào container'
docker cp $cleanPath "${Container}:/tmp/backup_clean.sql"
if ($LASTEXITCODE -ne 0) { throw "docker cp thất bại" }
docker exec $Container psql -U $User -d $Database -v ON_ERROR_STOP=1 -f /tmp/backup_clean.sql
if ($LASTEXITCODE -ne 0) { throw "psql import thất bại (exit $LASTEXITCODE)" }
docker exec $Container rm -f /tmp/backup_clean.sql | Out-Null
Ok 'import thành công'

# --- Step 5: Post-import cleanup -----------------------------------------
Step '5. Reset _prisma_migrations + drop bảng comment_likes (orphan)'
docker exec $Container psql -U $User -d $Database -v ON_ERROR_STOP=1 -c `
  "DELETE FROM _prisma_migrations; DROP TABLE IF EXISTS comment_likes CASCADE;"
if ($LASTEXITCODE -ne 0) { throw "Post-import cleanup thất bại" }
Ok 'cleanup xong'

# --- Step 6: Mark baseline applied ---------------------------------------
Step "6. prisma migrate resolve --applied $baseline"
Push-Location $backendDir
try {
  npx prisma migrate resolve --applied $baseline
  if ($LASTEXITCODE -ne 0) { throw "migrate resolve thất bại" }
  Ok "$baseline đã được mark applied"

  # --- Step 7: Apply remaining migrations --------------------------------
  Step '7. prisma migrate deploy (apply 15 migration còn lại)'
  npx prisma migrate deploy
  if ($LASTEXITCODE -ne 0) { throw "migrate deploy thất bại" }
  Ok 'tất cả migration đã apply'

  # --- Step 8: Verify ---------------------------------------------------
  Step '8. Verify migrate status'
  npx prisma migrate status
} finally {
  Pop-Location
}

Write-Host ''
Write-Host 'HOÀN TẤT.' -ForegroundColor Green
Write-Host "  - backup_clean.sql: $cleanPath (có thể xoá)"
if (-not $SkipPreBackup) {
  Write-Host "  - rollback dump:    $preDump (giữ lại tới khi verify xong)"
}
Write-Host '  - Spot-check: docker exec -it ' $Container ' psql -U ' $User ' -d ' $Database " -c 'SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM stories; SELECT COUNT(*) FROM chapters;'"
