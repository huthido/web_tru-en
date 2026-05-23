$ErrorActionPreference = "Stop"
$base = "http://localhost:3009/api"
$mobile = @{ 'X-Client-Type' = 'mobile' }

function Login($email, $pass) {
  $body = @{ emailOrUsername = $email; password = $pass } | ConvertTo-Json
  $r = Invoke-RestMethod -Method POST "$base/auth/login" -Headers $mobile -ContentType 'application/json' -Body $body
  return $r.data.accessToken
}

function AuthHdr($t) { return @{ Authorization = "Bearer $t"; 'X-Client-Type' = 'mobile' } }

Write-Host "=== Login 3 accounts ==="
$tDel = Login 'test-del-1@compliance.test' 'Test@123'
Write-Host "  test-del-1 OK"
$t1 = Login 'user1@hungyeu.com' 'User123@'
Write-Host "  user1 OK"
$tAdmin = Login 'admin@hungyeu.com' 'Admin@123'
Write-Host "  admin OK"

# Need IDs
$u1 = (Invoke-RestMethod "$base/users/me" -Headers (AuthHdr $t1)).data
$u2id = "cmj569l650004bgd6yazodhbm"   # user2 ID từ seed step 3
$storyId = "cmk3m27k1000h6kshwyornxxy" # story ID từ seed step 3

# ─── 4a. Soft-delete ───────────────────────────────────────────────
Write-Host "`n=== 4a. Soft-delete throwaway user ==="
Write-Host "-- 4a.1 DELETE /users/me SAI password (expect 401)"
try {
  Invoke-RestMethod -Method DELETE "$base/users/me" -Headers (AuthHdr $tDel) -ContentType 'application/json' -Body '{"password":"WrongPass!"}'
  Write-Host "  ✗ FAIL: lẽ ra phải 401"
} catch {
  Write-Host "  ✓ rejected: $($_.ErrorDetails.Message)"
}

Write-Host "-- 4a.2 DELETE /users/me ĐÚNG password (expect success)"
$delRes = Invoke-RestMethod -Method DELETE "$base/users/me" -Headers (AuthHdr $tDel) -ContentType 'application/json' -Body '{"password":"Test@123"}'
Write-Host "  ✓ $($delRes | ConvertTo-Json -Compress)"

Write-Host "-- 4a.3 Re-login email cũ (expect reject)"
try {
  $bad = Login 'test-del-1@compliance.test' 'Test@123'
  Write-Host "  ✗ FAIL: vẫn login được, token=$($bad.Substring(0,30))"
} catch {
  Write-Host "  ✓ rejected: $($_.ErrorDetails.Message)"
}

Write-Host "-- 4a.4 Verify DB: email + deletedAt anonymised"
$check = npx tsx -e "import { PrismaClient } from '@prisma/client'; const p=new PrismaClient(); p.user.findUnique({where:{id:'cmphse76a000011758g6gzotg'}, select:{email:true,username:true,deletedAt:true,isActive:true,displayName:true,avatar:true,password:true}}).then(u=>console.log(JSON.stringify(u,null,2))).finally(()=>p.`$disconnect`());"
Write-Host $check

# ─── 4b. Block / unblock ───────────────────────────────────────────
Write-Host "`n=== 4b. Block user1 → user2 ==="
Write-Host "-- 4b.1 POST /users/$u2id/block"
$bl1 = Invoke-RestMethod -Method POST "$base/users/$u2id/block" -Headers (AuthHdr $t1)
Write-Host "  ✓ $($bl1 | ConvertTo-Json -Compress)"

Write-Host "-- 4b.2 POST /users/$u2id/block (lần 2 — idempotent)"
$bl2 = Invoke-RestMethod -Method POST "$base/users/$u2id/block" -Headers (AuthHdr $t1)
Write-Host "  ✓ $($bl2 | ConvertTo-Json -Compress)"

Write-Host "-- 4b.3 GET /users/me/blocks (expect 1 entry blocked=user2)"
$list1 = Invoke-RestMethod "$base/users/me/blocks" -Headers (AuthHdr $t1)
Write-Host ($list1 | ConvertTo-Json -Depth 4)

Write-Host "-- 4b.4 POST /users/$($u1.id)/block (self-block, expect 400)"
try {
  Invoke-RestMethod -Method POST "$base/users/$($u1.id)/block" -Headers (AuthHdr $t1)
  Write-Host "  ✗ FAIL: lẽ ra phải 400"
} catch {
  Write-Host "  ✓ rejected: $($_.ErrorDetails.Message)"
}

Write-Host "-- 4b.5 DELETE /users/$u2id/block (unblock)"
$unbl = Invoke-RestMethod -Method DELETE "$base/users/$u2id/block" -Headers (AuthHdr $t1)
Write-Host "  ✓ $($unbl | ConvertTo-Json -Compress)"

Write-Host "-- 4b.6 GET /users/me/blocks (expect rỗng)"
$list2 = Invoke-RestMethod "$base/users/me/blocks" -Headers (AuthHdr $t1)
Write-Host "  count = $(@($list2.data).Count)"

# ─── 4c. Report story ──────────────────────────────────────────────
Write-Host "`n=== 4c. Report a story ==="
$repBody = @{ targetType='STORY'; targetId=$storyId; reason='SPAM'; note='Phần tả nhân vật lặp lại quá nhiều (test)' } | ConvertTo-Json
$rep = Invoke-RestMethod -Method POST "$base/reports" -Headers (AuthHdr $t1) -ContentType 'application/json' -Body $repBody
Write-Host ($rep | ConvertTo-Json -Depth 4)
$reportId = $rep.data.id

# ─── 4d. Admin list + resolve ──────────────────────────────────────
Write-Host "`n=== 4d. Admin list reports + resolve ==="
$list = Invoke-RestMethod "$base/admin/reports?status=PENDING" -Headers (AuthHdr $tAdmin)
Write-Host "  PENDING count = $(@($list.data.items).Count)"
$found = $list.data.items | Where-Object { $_.id -eq $reportId }
if ($found) { Write-Host "  ✓ found seeded report $reportId in admin list" }
else { Write-Host "  ✗ MISSING $reportId from admin list" }

Write-Host "-- 4d.2 PATCH /admin/reports/$reportId status=RESOLVED"
$resolve = Invoke-RestMethod -Method PATCH "$base/admin/reports/$reportId" -Headers (AuthHdr $tAdmin) -ContentType 'application/json' -Body '{"status":"RESOLVED"}'
Write-Host ($resolve | ConvertTo-Json -Depth 4)

Write-Host "-- 4d.3 PATCH lần 2 (expect reject vì không còn PENDING)"
try {
  Invoke-RestMethod -Method PATCH "$base/admin/reports/$reportId" -Headers (AuthHdr $tAdmin) -ContentType 'application/json' -Body '{"status":"DISMISSED"}'
  Write-Host "  ✗ FAIL: lẽ ra phải reject"
} catch {
  Write-Host "  ✓ rejected: $($_.ErrorDetails.Message)"
}

Write-Host "`n=== DONE ==="
