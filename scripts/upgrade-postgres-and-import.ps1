<#
.SYNOPSIS
  Nâng Postgres container 16 -> 18 (wipe volume, fresh init) RỒI import backup.sql.

.DESCRIPTION
  PG major upgrade KHÔNG thể chỉ đổi tag — PG18 không đọc được data directory PG16.
  Vì DB đích đang trống (chưa có data thật), cách sạch nhất là:
    1. docker compose stop postgres pgbouncer backend frontend
    2. docker volume rm <project>_postgres_data   (wipe data dir)
    3. docker compose up -d postgres              (init lại với image postgres:18)
    4. Đợi healthy
    5. Gọi import-backup.ps1 -SkipPreBackup -Force

  Trước khi chạy: chắc chắn docker-compose.yaml đã đổi image -> postgres:18-alpine
  (đã sửa ở repo). Volume name = "<project>_postgres_data" — auto-detect.

.PARAMETER Force
  Bỏ qua confirm trước khi xoá volume.

.PARAMETER ComposeProject
  Tên project compose (mặc định lấy theo tên folder repo).
#>

[CmdletBinding()]
param(
  [switch]$Force,
  [string]$ComposeProject
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot
try {
  if (-not $ComposeProject) {
    $ComposeProject = (Split-Path -Leaf $repoRoot).ToLower() -replace '[^a-z0-9]', ''
  }
  $volumeName = "${ComposeProject}_postgres_data"

  Write-Host "==> Phát hiện volume cần wipe: $volumeName" -ForegroundColor Cyan
  $exists = docker volume ls --format '{{.Name}}' | Where-Object { $_ -eq $volumeName }
  if (-not $exists) {
    Write-Host "    Volume '$volumeName' không tồn tại — có thể compose project khác tên." -ForegroundColor Yellow
    Write-Host "    Liệt kê volumes có chứa 'postgres':" -ForegroundColor Yellow
    docker volume ls --format '{{.Name}}' | Where-Object { $_ -match 'postgres' }
    throw "Không tìm thấy volume. Truyền -ComposeProject <tên> đúng."
  }

  if (-not $Force) {
    $ans = Read-Host "Xác nhận: STOP postgres/pgbouncer/backend/frontend + XOÁ volume $volumeName? [y/N]"
    if ($ans -notmatch '^[yY]') { throw 'Aborted.' }
  }

  Write-Host '==> 1. Stop services phụ thuộc Postgres' -ForegroundColor Cyan
  docker compose stop frontend backend pgbouncer postgres 2>&1 | ForEach-Object { Write-Host "    $_" }

  Write-Host "==> 2. Xoá volume $volumeName" -ForegroundColor Cyan
  docker volume rm $volumeName | Out-Null
  Write-Host '    xong' -ForegroundColor Green

  Write-Host '==> 3. Start lại postgres (image:postgres:18-alpine init lần đầu)' -ForegroundColor Cyan
  docker compose up -d postgres
  if ($LASTEXITCODE -ne 0) { throw 'docker compose up postgres thất bại' }

  Write-Host '==> 4. Đợi postgres healthy...' -ForegroundColor Cyan
  $tries = 0
  while ($tries -lt 30) {
    $status = docker inspect --format '{{.State.Health.Status}}' web_truyen_postgres 2>$null
    if ($status -eq 'healthy') { break }
    Start-Sleep -Seconds 2
    $tries++
  }
  if ($status -ne 'healthy') { throw "Postgres không healthy sau 60s (status: $status)" }
  Write-Host "    healthy ✓" -ForegroundColor Green

  $version = docker exec web_truyen_postgres psql -U user -d web_truyen_db -tAc 'SHOW server_version;'
  Write-Host "    server_version: $version" -ForegroundColor Green

  Write-Host '==> 5. Khởi động pgbouncer' -ForegroundColor Cyan
  docker compose up -d pgbouncer

  Write-Host '==> 6. Chạy import-backup.ps1 -SkipPreBackup -Force' -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot 'import-backup.ps1') -SkipPreBackup -Force
  if ($LASTEXITCODE -ne 0) { throw 'import-backup.ps1 thất bại' }

  Write-Host ''
  Write-Host 'HOÀN TẤT. Postgres đã nâng lên 18 + data đã restore từ backup.sql' -ForegroundColor Green
  Write-Host 'Bước tiếp: docker compose up -d backend frontend'
} finally {
  Pop-Location
}
