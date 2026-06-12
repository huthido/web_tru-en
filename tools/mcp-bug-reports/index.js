#!/usr/bin/env node
/**
 * MCP server — AI agent đọc/cập nhật bug reports của YÊU.
 *
 * Nói chuyện với backend NestJS qua REST `/api/agent/bug-reports/*`,
 * xác thực bằng header `x-api-key` (env AGENT_API_KEY phía backend).
 *
 * Env:
 *   BUG_API_URL  — base URL API backend, mặc định http://localhost:3001/api
 *   BUG_API_KEY  — API key, phải trùng AGENT_API_KEY của backend (bắt buộc)
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE_URL = (process.env.BUG_API_URL || 'http://localhost:3001/api').replace(/\/+$/, '');
const API_KEY = process.env.BUG_API_KEY;

if (!API_KEY) {
  console.error('[mcp-bug-reports] Thiếu env BUG_API_KEY — đặt trùng AGENT_API_KEY của backend.');
  process.exit(1);
}

/** Gọi backend, bóc envelope {success,data,timestamp}, trả payload. */
async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'x-api-key': API_KEY,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.message || json?.error || `HTTP ${res.status}`;
    throw new Error(`Backend trả lỗi: ${Array.isArray(msg) ? msg.join('; ') : msg}`);
  }
  return json && typeof json === 'object' && 'data' in json ? json.data : json;
}

function asText(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

const STATUS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const PLATFORM = ['WEB', 'ANDROID', 'IOS', 'OTHER'];
const SEVERITY = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const server = new McpServer({ name: 'bug-reports', version: '1.0.0' });

server.registerTool(
  'list_bug_reports',
  {
    title: 'Liệt kê bug reports',
    description:
      'Liệt kê bug reports người dùng đã gửi, mới nhất trước. Lọc được theo status (OPEN/IN_PROGRESS/RESOLVED/CLOSED), platform (WEB/ANDROID/IOS/OTHER), severity (LOW/MEDIUM/HIGH/CRITICAL). Trả về danh sách + meta phân trang.',
    inputSchema: {
      status: z.enum(STATUS).optional().describe('Lọc theo trạng thái'),
      platform: z.enum(PLATFORM).optional().describe('Lọc theo nền tảng'),
      severity: z.enum(SEVERITY).optional().describe('Lọc theo mức độ'),
      page: z.number().int().min(1).optional().describe('Trang, mặc định 1'),
      limit: z.number().int().min(1).max(100).optional().describe('Số dòng mỗi trang, mặc định 20'),
    },
  },
  async (args) => {
    const params = new URLSearchParams();
    for (const k of ['status', 'platform', 'severity', 'page', 'limit']) {
      if (args[k] !== undefined) params.set(k, String(args[k]));
    }
    const qs = params.toString();
    return asText(await api(`/agent/bug-reports${qs ? `?${qs}` : ''}`));
  },
);

server.registerTool(
  'get_bug_report',
  {
    title: 'Xem chi tiết một bug report',
    description:
      'Lấy đầy đủ một bug report theo id: mô tả, các bước tái hiện, trang/màn hình gặp lỗi, thiết bị, phiên bản app, người báo và ghi chú xử lý.',
    inputSchema: {
      id: z.string().min(1).describe('ID của bug report'),
    },
  },
  async ({ id }) => asText(await api(`/agent/bug-reports/${encodeURIComponent(id)}`)),
);

server.registerTool(
  'update_bug_report',
  {
    title: 'Cập nhật bug report',
    description:
      'Cập nhật trạng thái / mức độ / ghi chú xử lý của một bug report — dùng để đánh dấu IN_PROGRESS khi bắt đầu điều tra và RESOLVED kèm adminNote mô tả nguyên nhân + cách fix khi xong.',
    inputSchema: {
      id: z.string().min(1).describe('ID của bug report'),
      status: z.enum(STATUS).optional().describe('Trạng thái mới'),
      severity: z.enum(SEVERITY).optional().describe('Mức độ đánh giá lại'),
      adminNote: z.string().max(5000).optional().describe('Ghi chú nguyên nhân / cách fix'),
    },
  },
  async ({ id, ...body }) =>
    asText(await api(`/agent/bug-reports/${encodeURIComponent(id)}`, { method: 'PATCH', body })),
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[mcp-bug-reports] sẵn sàng — backend: ${BASE_URL}`);
