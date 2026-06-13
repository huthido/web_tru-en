# Runbook: ra một truyện MỚI (tự động qua MCP)

Quy trình chuẩn để AI viết + đăng + lên lịch một truyện gốc hoàn chỉnh trên
yeuyeu.net. Gọi nhanh bằng slash command `/truyen-moi` (xem
`.claude/commands/truyen-moi.md`), hoặc làm thủ công theo các bước dưới.

Tài khoản & hạ tầng MCP: xem memory `bug-report-mcp`. MCP server `yeu-author`
cấu hình trong `.mcp.json` (gitignored), trỏ production. Các script dùng chung
`tools/mcp_client.py` (hàm `connect("yeu-author")`).

---

## PHA 1 — viết + đăng nháp + xin duyệt (một lệnh làm hết)

### 1. Chọn trope đang hot, KHÔNG trùng truyện sẵn có
- `WebSearch` xu hướng truyện/web-novel hiện tại (ngôn tình, hệ thống, hồi quy,
  tiên hiệp, ác nữ, dị giới, võng du...).
- Lấy danh sách truyện đang có để tránh trùng concept/title:
  `curl -s "https://yeuyeu.net/api/stories?limit=100"` → đọc title + tags.
- Chốt 1 trope/biến tấu chưa ai làm trên trang.

### 2. Lên khung + viết TRỌN BỘ (arc hoàn chỉnh, ~12-15 chương)
- Thiết kế cốt truyện có **mở – cao trào – kết** (HE hoặc kết thỏa mãn), giải
  quyết hết các tuyến chính. KHÔNG để lửng kiểu serial vô tận.
- Mỗi chương 600–900 từ, **HTML mỗi đoạn trong `<p>`**, kết chương bằng hook.
- Đặt nội dung vào module `tools/<slug>-chapters.py` theo mẫu
  `tools/full-story-chapters.py`: list `CHAPTERS = [(order, title, html), ...]`.

### TIÊU CHUẨN BẮT BUỘC
- **Nội dung 100% gốc.** TUYỆT ĐỐI không sao chép văn bản/cốt truyện có bản
  quyền của tác phẩm khác. Viết mới theo công thức/trope, không copy.
- Nhân vật nhất quán, tên Việt/Hán-Việt hợp thể loại.
- Backend chặn chương < 100 ký tự và login có throttle — viết đủ dài, đừng spam login.

### 3. Tạo truyện + đẩy chương nháp + bìa, qua MCP
Soạn 1 script kiểu `tools/push-full-story.py` (đổi slug/module) làm:
- `login`
- `create_story` (title, description, tags) → lấy `slug`, `storyId`
- `create_chapter` cho từng chương (giữ nháp, set `order`)
- **Bìa**: tìm ảnh giấy phép tự do (Wikimedia Commons, lọc CC0/CC BY/Public
  domain, khổ dọc ≥900px), `upload_story_cover` (nhận file local hoặc URL),
  rồi `update_story` thêm dòng credit vào cuối description (xem `tools/set-cover.py`).
- `request_story_approval` (storyId, message) → trạng thái PENDING.

### 4. DỪNG, bàn giao bước duyệt
Báo user: "Đã viết xong N chương + xin duyệt. Vào **admin dashboard duyệt
truyện**, xong nhắn 'đã duyệt' để mình lên lịch." (Tài khoản MCP là AUTHOR,
không tự duyệt được — đây là cổng thủ công duy nhất.)

---

## PHA 2 — lên lịch (sau khi user nói "đã duyệt")

Server tự đăng theo lịch, không cần Claude/máy user mở.

- Tính mốc **19:00 giờ VN = 12:00 UTC** kế tiếp.
- Tool `schedule_chapters`: `{ storySlug, startAt: "<ISO UTC>", intervalHours: 24,
  perBatch: 1, reset: true }` → rải đều mọi chương nháp, 1 chương/ngày.
- Mẫu tính mốc + gọi: `tools/push-full-story.py` (phần cuối).
- Verify: `curl .../api/stories/<slug>/chapters` chỉ thấy chương đã publish;
  phần còn lại server tự nhả mỗi ngày.

### Lưu ý vận hành
- **Không** chạy `release-chapters.py` thủ công khi đã đặt lịch — sẽ lệch lịch.
- Đặt lại lịch: gọi `schedule_chapters` với `reset: true`.
- Cron server `ChaptersCron` quét mỗi phút; chỉ đăng chương của truyện đã publish.
- Cadence mặc định: 1 chương/ngày 19:00 VN. Đổi bằng `intervalHours`/`perBatch`.

---

## Tham chiếu nhanh — tool MCP yeu-author
`login`, `whoami`, `list_my_stories`, `get_story`, `create_story`,
`update_story`, `list_chapters`, `get_chapter`, `create_chapter`,
`update_chapter`, `publish_chapter`, `upload_story_cover`,
`upload_chapter_image`, `request_story_approval`, `schedule_chapters`.
