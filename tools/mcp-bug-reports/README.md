# mcp-bug-reports

MCP server cho phép AI agent (Claude Code, Cursor, v.v.) đọc và cập nhật
bug reports người dùng gửi từ web/app YÊU, xác thực bằng API key.

## Kiến trúc

```
User báo bug (web /bao-loi, app mobile)
        │ POST /api/bug-reports  (JWT)
        ▼
   Backend NestJS ── bảng bug_reports (Postgres)
        ▲
        │ GET/PATCH /api/agent/bug-reports  (header x-api-key = AGENT_API_KEY)
        │
  MCP server này (stdio) ◄── AI agent gọi tool
```

## Cài đặt

```bash
cd tools/mcp-bug-reports
pnpm install --ignore-workspace   # standalone, không nằm trong workspace
```

Backend cần env `AGENT_API_KEY` (đã thêm vào `apps/backend/.env` local).
Chưa đặt key ⇒ toàn bộ endpoint `/api/agent/*` bị từ chối (fail-closed).

## Cấu hình cho Claude Code

Thêm vào `.mcp.json` ở root dự án (hoặc `claude mcp add`):

```json
{
  "mcpServers": {
    "bug-reports": {
      "command": "node",
      "args": ["tools/mcp-bug-reports/index.js"],
      "env": {
        "BUG_API_URL": "http://localhost:3001/api",
        "BUG_API_KEY": "<trùng AGENT_API_KEY của backend>"
      }
    }
  }
}
```

Với server production, đổi `BUG_API_URL` thành `https://<domain>/api`.

## Tools

| Tool | Mô tả |
|---|---|
| `list_bug_reports` | Liệt kê bug, lọc theo `status` / `platform` / `severity`, phân trang |
| `get_bug_report` | Chi tiết một bug theo `id` (mô tả, thiết bị, người báo, ghi chú) |
| `update_bug_report` | Đổi `status` / `severity` / `adminNote` — đánh dấu đang xử lý / đã sửa |

Quy ước cho agent: khi bắt đầu điều tra một bug hãy chuyển `IN_PROGRESS`;
khi sửa xong chuyển `RESOLVED` kèm `adminNote` ghi nguyên nhân + commit fix.
