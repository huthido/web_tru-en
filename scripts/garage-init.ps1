# =====================================================================
# Thiết lập Garage cho chế độ `pnpm docker:local` (bản PowerShell).
# Tương đương scripts/garage-init.sh — xem file đó để biết chi tiết.
# Dùng:  pnpm docker:local  rồi  pwsh scripts/garage-init.ps1
# =====================================================================
$ErrorActionPreference = 'Stop'
$GC = 'web_truyen_garage'

# Dùng `garage` (bare — đã trong PATH của container) cho gọn.
function Garage { docker exec $GC garage @args }

Write-Host "==> Thiết lập Garage ($GC)..."

# --- Container phải đang chạy ---
$names = docker ps --format '{{.Names}}'
if ($names -notcontains $GC) {
  Write-Host "✗ Container $GC chưa chạy. Hãy chạy 'pnpm docker:local' trước."
  exit 1
}

# --- Chờ Garage RPC sẵn sàng (tối đa ~60s) ---
Write-Host "==> Chờ Garage phản hồi..."
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  try { Garage status *> $null; if ($LASTEXITCODE -eq 0) { $ready = $true; break } } catch {}
  Start-Sleep -Seconds 2
}
if (-not $ready) {
  Write-Host "✗ Garage không phản hồi. Xem log: docker logs $GC"
  exit 1
}

# --- 1. Gán + áp layout (bỏ qua nếu đã có) ---
$layout = (Garage layout show 2>$null) -join "`n"
if ($layout -match 'version: *[1-9]') {
  Write-Host "==> Layout đã tồn tại — bỏ qua."
} else {
  $node = (Garage node id -q 2>$null) -split '@' | Select-Object -First 1
  if ([string]::IsNullOrWhiteSpace($node)) {
    Write-Host "✗ Không lấy được node id của Garage."
    exit 1
  }
  Write-Host ("==> Gán layout cho node {0}…" -f $node.Substring(0, [Math]::Min(16, $node.Length)))
  Garage layout assign $node -z dc1 -c 1G
  Garage layout apply --version 1
  Write-Host "==> Đã áp layout."
}

# --- 2. Tạo bucket (idempotent) ---
$buckets = (Garage bucket list 2>$null) -join "`n"
if ($buckets -match 'web-truyen') {
  Write-Host "==> Bucket 'web-truyen' đã có."
} else {
  Garage bucket create web-truyen | Out-Null
  Write-Host "==> Đã tạo bucket 'web-truyen'."
}

Write-Host ""
Write-Host "✓ Garage sẵn sàng — container sẽ chuyển 'healthy' sau ~30s."
Write-Host "  Backend mặc định dùng lưu trữ LOCAL (volume backend_uploads)."
Write-Host "  Muốn dùng Garage S3: tạo key rồi điền S3_* vào .env (xem garage-init.sh)."
