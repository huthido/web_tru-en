# Runbook: ra chương hằng ngày — "Ác Nữ Hồi Quy: Hệ Thống Ép Tôi Làm Người Tốt"

Truyện sáng tác gốc do AI viết tiếp mỗi ngày, đăng qua MCP `yeu-author`
(config trong `.mcp.json` local — KHÔNG commit file đó).

- **Story ID**: `cmqbn5vd2000gss96k4cexzms`
- **Slug**: `ac-nu-hoi-quy-he-thong-ep-toi-lam-nguoi-tot`
- **Nhịp phát hành**: mỗi ngày đăng 1–2 chương, luôn giữ lại ≥1 chương nháp làm buffer.

## Quy trình mỗi ngày

1. Kết nối MCP `yeu-author` (pattern McpClient có sẵn trong `tools/request-approval.py`).
2. `list_chapters` với slug trên → đếm chương nháp (`isPublished: false`).
3. Nếu truyện đã được duyệt (chương publish được):
   - Đăng 1–2 chương nháp **cũ nhất** (`publish_chapter`).
   - Nếu publish lỗi "Truyện cần được xuất bản trước" → admin chưa duyệt, dừng và báo user.
4. Viết chương mới (`create_chapter`, giữ nháp) sao cho sau khi đăng vẫn còn ≥1 nháp buffer.
   Mỗi chương 600–900 từ, HTML mỗi đoạn trong `<p>`, đặt `order` tiếp nối.

## Bible truyện (đọc kỹ trước khi viết tiếp)

**Tông**: nữ cường + hài hước + cổ đại huyền huyễn, nhịp nhanh, thoại sắc.
Nét đặc trưng: Vân Khê "làm việc thiện kiểu ác nữ" — vừa thiện lương vừa thu lợi,
hệ thống 707 luôn hoảng hốt vì ký chủ lách luật. Mỗi chương kết bằng một hook.

**Nhân vật**:
- **Vân Khê** (nữ chính, 16t): con gái tướng quân, kiếp trước bị vu 18 tội danh
  và xử trảm, hồi quy về 3 năm trước. Thông minh, mặt dày, lý luận "người tốt
  phải tốt một cách có não". Váy đỏ là màu đặc trưng.
- **Hệ thống 707**: Hệ Thống Cải Tà Quy Chính. Chỉ tiêu 1000 điểm thiện lương
  trong 3 năm, không đạt = chết. Cứu người +10, quyên góp +5, nhường nhịn +3,
  việc ác trừ gấp đôi. Giọng lảnh lót, hay bị Vân Khê làm cứng họng.
- **Vân Nhu** (biểu muội, phản diện phụ): chuyên diễn vai nạn nhân, kiếp trước
  là người giật dây chính. Đã bị bắt bài ở chương 2.
- **Lý Thầm** (nam chính, Cửu hoàng tử): giả bệnh yếu, thực chất cao thủ đứng sau
  màn. BÍ ẨN LỚN: dữ liệu về hắn trong hệ thống "bị ai đó xóa sạch" (gợi ý:
  hắn cũng có thể là người hồi quy / có hệ thống). Kiếp trước từng ném vò rượu
  ngon cho Vân Khê ở pháp trường.

**Thread đang mở** (khai thác dần, đừng đốt hết một chương):
1. 1000 điểm thiện lương / 3 năm — đếm điểm đều đặn mỗi chương.
2. Thương vụ cửa hàng vải nhà họ Tô (phố Đông, có mạch nước khoáng nóng dưới kho)
   — bước đầu xây đế chế kinh tế.
3. Bí ẩn Lý Thầm + vì sao dữ liệu bị xóa.
4. 18 tội danh kiếp trước — lần ngược từng vụ, ai là chủ mưu thật sự.
5. Vân Nhu sẽ không bỏ cuộc — leo thang dần.

**Cấm**: không sao chép văn bản từ truyện khác; không đổi tông sang bi kịch nặng;
không để Vân Khê yếu đuối/bị động.
