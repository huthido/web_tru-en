# -*- coding: utf-8 -*-
"""Đẩy chương 4-15 (trọn bộ) lên production dạng nháp + đặt lịch 1 chương/ngày 19:00 VN.
Chương 3 đã là nháp sẵn trên production → cũng được đưa vào lịch (reset=True).
"""
import os
import sys
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcp_client import connect  # noqa: E402

# Nội dung truyện ở module riêng (tên có dấu gạch nối nên import bằng __import__).
story = __import__("full-story-chapters")
CHAPTERS = story.CHAPTERS

SLUG = "ac-nu-hoi-quy-he-thong-ep-toi-lam-nguoi-tot"

# Mốc 19:00 giờ VN = 12:00 UTC. Tìm lần 12:00:00Z kế tiếp tính từ bây giờ.
now = datetime.now(timezone.utc)
start = now.replace(hour=12, minute=0, second=0, microsecond=0)
if start <= now:
    start += timedelta(days=1)
start_iso = start.strftime("%Y-%m-%dT%H:%M:%SZ")

mcp = connect("yeu-author")
ok, _ = mcp.tool("login")
print("login:", "OK" if ok else "FAIL")

# 1) Tạo chương 4-15 dạng nháp (không publish).
created = 0
for order, title, content in CHAPTERS:
    ok, ch = mcp.tool("create_chapter", {"storySlug": SLUG, "title": title, "content": content, "order": order})
    if ok and ch.get("id"):
        created += 1
        print(f"  + chương {order}: {ch['slug']} ({ch.get('wordCount','?')} từ)")
    else:
        print(f"  ! chương {order} FAIL: {str(ch)[:160]}")
print(f"Đã tạo {created}/{len(CHAPTERS)} chương nháp.")

# 2) Đặt lịch toàn bộ chương nháp (gồm cả chương 3) — 1 chương/ngày, bắt đầu 19:00 VN.
ok, res = mcp.tool("schedule_chapters", {
    "storySlug": SLUG,
    "startAt": start_iso,
    "intervalHours": 24,
    "perBatch": 1,
    "reset": True,
})
if ok:
    print(f"\nĐặt lịch OK — {res.get('count')} chương, bắt đầu {start_iso} (19:00 VN), 1 chương/ngày:")
    for c in res.get("scheduled", []):
        print(f"  [{c.get('order')}] {c.get('title')} -> {c.get('scheduledPublishAt')}")
else:
    print(f"\nĐặt lịch FAIL: {res}")

mcp.close()
