# Đăng N chương nháp cũ nhất của truyện qua mcp-author.
# Dùng: python tools/release-chapters.py <storySlug> [N=1]
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcp_client import McpClient, connect, ROOT  # noqa: E402
import json

slug = sys.argv[1]
count = int(sys.argv[2]) if len(sys.argv) > 2 else 1

mcp = connect("yeu-author")
ok, _ = mcp.tool("login")
if not ok:
    raise SystemExit("login FAIL")

ok, chapters = mcp.tool("list_chapters", {"storySlug": slug})
if not ok:
    raise SystemExit(f"list_chapters FAIL: {chapters}")
arr = chapters if isinstance(chapters, list) else chapters.get("data", [])
arr = sorted(arr, key=lambda c: c.get("order", 0))

drafts = [c for c in arr if not c.get("isPublished")]
published = [c for c in arr if c.get("isPublished")]
print(f"Truyện {slug}: {len(published)} chương đã đăng, {len(drafts)} nháp")

for c in drafts[:count]:
    ok, res = mcp.tool("publish_chapter", {"storySlug": slug, "chapterId": c["id"], "publish": True})
    status = "ĐÃ ĐĂNG" if ok else f"FAIL — {res}"
    print(f"  [{c.get('order')}] {c.get('title')}: {status}")

remaining = len(drafts) - min(count, len(drafts))
print(f"Còn lại {remaining} chương nháp buffer.")
mcp.close()
