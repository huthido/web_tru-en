# Test lịch tự xuất bản chương qua mcp-author + cron backend LOCAL (:3009).
import os
import sys
import time
import subprocess
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcp_client import McpClient  # noqa: E402

mcp = McpClient("node", ["tools/mcp-author/index.js"], {
    "YEU_API_URL": "http://localhost:3009/api",
    "YEU_EMAIL": "e2e-author@test.local",
    "YEU_PASSWORD": "E2eTest!2026",
})

PASS, FAIL = [], []
def check(name, cond, detail=""):
    (PASS if cond else FAIL).append(name)
    print(("  PASS  " if cond else "  FAIL  ") + name + (f"  -- {detail}" if detail else ""))

ok, _ = mcp.tool("login")
check("login", ok)

# Tạo truyện test rồi publish (admin route không có; dùng request_story_approval
# sẽ PENDING. Thay vào đó test cron cần story.isPublished=true — ta set qua
# update? Không có. Nên test trên truyện đã publish: tạo + admin duyệt thủ công
# không khả thi ở local. Cách khác: tạo truyện, rồi gán isPublished qua DB.)
ok, story = mcp.tool("create_story", {
    "title": "Test Lịch Xuất Bản",
    "description": "Truyện test cron scheduled publish — sẽ xoá.",
})
slug = story["slug"]
sid = story["id"]
print("story:", sid, slug)

CONTENT = ("<p>" + "Nội dung chương test đủ dài để vượt qua kiểm tra tối thiểu 100 ký tự. " * 3 + "</p>")
chap_ids = []
for i in range(1, 4):
    ok, ch = mcp.tool("create_chapter", {"storySlug": slug, "title": f"Chương {i}", "content": CONTENT, "order": i})
    chap_ids.append(ch["id"])
check("tạo 3 chương nháp", len(chap_ids) == 3)

# Cho phép publish: cron chỉ đăng khi story.isPublished=true. Set trực tiếp DB
# (mô phỏng admin duyệt). subprocess.run với list args — không qua shell.
subprocess.run(
    ["docker", "exec", "web_truyen_postgres", "psql", "-U", "user", "-d", "web_truyen_db",
     "-c", f"UPDATE stories SET \"isPublished\"=true, status='ONGOING' WHERE id='{sid}';"],
    check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)

# Đặt lịch: chương 1 ở quá khứ (đăng ngay đợt cron tới), 2 và 3 cách 24h.
start = (datetime.now(timezone.utc) - timedelta(minutes=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
ok, res = mcp.tool("schedule_chapters", {"storySlug": slug, "startAt": start, "intervalHours": 24})
check("schedule_chapters", ok and res.get("count") == 3, str(res)[:200])

# Chờ cron (mỗi phút) đăng chương 1 (lịch ở quá khứ). Tối đa ~75s.
print("  ... chờ cron đăng chương 1 (tối đa 80s)")
published = False
for _ in range(16):
    time.sleep(5)
    ok, chapters = mcp.tool("list_chapters", {"storySlug": slug})
    arr = chapters if isinstance(chapters, list) else chapters.get("data", [])
    pub = [c for c in arr if c.get("isPublished")]
    if pub:
        published = True
        check("cron tự đăng chương tới hạn", len(pub) == 1, f"{len(pub)} chương đã đăng: {[c.get('title') for c in pub]}")
        break
if not published:
    check("cron tự đăng chương tới hạn", False, "hết 80s chưa đăng")

# Chương 2,3 vẫn nháp (lịch tương lai)
ok, chapters = mcp.tool("list_chapters", {"storySlug": slug})
arr = chapters if isinstance(chapters, list) else chapters.get("data", [])
drafts = [c for c in arr if not c.get("isPublished")]
check("chương lịch tương lai vẫn nháp", len(drafts) == 2, f"{len(drafts)} nháp")

mcp.close()
print(f"\n=== {len(PASS)} pass / {len(FAIL)} fail ===")
if FAIL:
    print("FAILED:", FAIL)
    sys.exit(1)
