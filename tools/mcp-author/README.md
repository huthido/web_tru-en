# mcp-author

MCP server cho phép AI đăng nhập YÊU như một user (tác giả), đọc danh sách
truyện của user, đọc/tạo/sửa chương và xuất bản chương.

## Cách xác thực

Server xác thực giống app mobile: `POST /auth/login` với header
`X-Client-Type: mobile` → nhận accessToken/refreshToken trong body.
Token chỉ giữ trong RAM của process MCP, tự refresh khi hết hạn,
tự đăng nhập lại khi refresh hỏng.

Hai cách cấp credential:

1. **Env (khuyên dùng)** — đặt `YEU_EMAIL` + `YEU_PASSWORD` trong config MCP;
   AI không bao giờ thấy mật khẩu, các tool tự đăng nhập khi cần.
2. **Tool `login`** — AI truyền email/mật khẩu trực tiếp (chỉ dùng khi user
   chủ động cung cấp trong hội thoại).

## Cài đặt

```bash
cd tools/mcp-author
pnpm install --ignore-workspace   # standalone, không nằm trong workspace
```

## Cấu hình cho Claude Code (`.mcp.json`)

```json
{
  "mcpServers": {
    "yeu-author": {
      "command": "node",
      "args": ["tools/mcp-author/index.js"],
      "env": {
        "YEU_API_URL": "http://localhost:3001/api",
        "YEU_EMAIL": "<email tài khoản>",
        "YEU_PASSWORD": "<mật khẩu>"
      }
    }
  }
}
```

Với server production, đổi `YEU_API_URL` thành `https://<domain>/api`.

## Tools

| Tool | Mô tả |
|---|---|
| `login` | Đăng nhập (tham số hoặc env) — trả về profile, không lộ token |
| `whoami` | Profile user đang đăng nhập |
| `list_my_stories` | Truyện do user sáng tác, mọi trạng thái, phân trang |
| `get_story` | Chi tiết truyện theo slug/id |
| `create_story` | Tạo truyện mới (bản nháp) |
| `list_chapters` | Danh sách chương của truyện |
| `get_chapter` | Đọc nội dung đầy đủ một chương |
| `create_chapter` | Tạo chương mới — nội dung HTML, mỗi đoạn trong `<p>` |
| `update_chapter` | Sửa tiêu đề/nội dung/giá — `content` ghi đè toàn bộ |
| `publish_chapter` | Xuất bản / gỡ xuất bản chương |
| `upload_story_cover` | Upload ảnh bìa (file local hoặc URL) + gán vào truyện |
| `upload_chapter_image` | Upload ảnh minh hoạ, trả URL + thẻ `<img>` để chèn vào chương |
| `request_story_approval` | Gửi yêu cầu admin duyệt xuất bản truyện (STORY_PUBLISH) |

Quy ước an toàn cho agent: chỉ `publish_chapter` khi user yêu cầu rõ ràng;
khi "viết tiếp" một chương phải `get_chapter` lấy nội dung cũ rồi nối thêm
(update là ghi đè toàn bộ).
