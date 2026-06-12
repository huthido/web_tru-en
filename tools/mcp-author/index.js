#!/usr/bin/env node
/**
 * MCP server — AI đăng nhập YÊU như một user (tác giả) và thao tác truyện/chương.
 *
 * Xác thực giống app mobile: POST /auth/login với header `X-Client-Type: mobile`
 * → accessToken/refreshToken trong body. Token giữ trong RAM của process,
 * tự refresh khi hết hạn (single-flight như mobile client).
 *
 * Env:
 *   YEU_API_URL   — base URL API backend, mặc định http://localhost:3001/api
 *   YEU_EMAIL     — (tuỳ chọn) email/username để tự đăng nhập
 *   YEU_PASSWORD  — (tuỳ chọn) mật khẩu để tự đăng nhập
 *
 * Đặt YEU_EMAIL/YEU_PASSWORD trong env thì AI không cần biết mật khẩu —
 * tool `login` không bắt buộc tham số.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE_URL = (process.env.YEU_API_URL || 'http://localhost:3001/api').replace(/\/+$/, '');

/** Token + credential state — chỉ sống trong RAM của process MCP. */
const state = {
  accessToken: null,
  refreshToken: null,
  user: null,
  // Giữ lại credential của lần login gần nhất để re-login khi refresh hỏng.
  creds: null,
  refreshing: null, // single-flight refresh promise
};

function unwrap(json) {
  return json && typeof json === 'object' && 'data' in json ? json.data : json;
}

async function rawPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-client-type': 'mobile' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.message || json?.error || `HTTP ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.join('; ') : String(msg));
  }
  return unwrap(json);
}

async function doLogin(emailOrUsername, password) {
  const data = await rawPost('/auth/login', { emailOrUsername, password });
  if (!data?.accessToken) throw new Error('Đăng nhập không trả về accessToken');
  state.accessToken = data.accessToken;
  state.refreshToken = data.refreshToken ?? null;
  state.user = data.user ?? null;
  state.creds = { emailOrUsername, password };
  return state.user;
}

/** Đăng nhập bằng env nếu chưa có session. */
async function ensureAuth() {
  if (state.accessToken) return;
  const email = process.env.YEU_EMAIL;
  const password = process.env.YEU_PASSWORD;
  if (email && password) {
    await doLogin(email, password);
    return;
  }
  throw new Error(
    'Chưa đăng nhập — gọi tool `login` trước, hoặc đặt env YEU_EMAIL/YEU_PASSWORD.',
  );
}

async function refreshSession() {
  // Single-flight: nhiều call 401 cùng lúc chỉ refresh một lần.
  if (state.refreshing) return state.refreshing;
  state.refreshing = (async () => {
    try {
      if (state.refreshToken) {
        const data = await rawPost('/auth/refresh', { refreshToken: state.refreshToken });
        if (data?.accessToken) {
          state.accessToken = data.accessToken;
          // Backend không rotate refresh token — giữ token cũ nếu không có mới.
          state.refreshToken = data.refreshToken ?? state.refreshToken;
          return;
        }
      }
      throw new Error('refresh failed');
    } catch {
      // Refresh hỏng → thử đăng nhập lại bằng credential đã biết.
      const creds =
        state.creds ??
        (process.env.YEU_EMAIL && process.env.YEU_PASSWORD
          ? { emailOrUsername: process.env.YEU_EMAIL, password: process.env.YEU_PASSWORD }
          : null);
      state.accessToken = null;
      if (!creds) throw new Error('Phiên hết hạn — gọi tool `login` lại.');
      await doLogin(creds.emailOrUsername, creds.password);
    } finally {
      state.refreshing = null;
    }
  })();
  return state.refreshing;
}

/** Gọi API có xác thực; tự refresh + retry một lần khi 401. */
async function api(path, { method = 'GET', body, params } = {}, isRetry = false) {
  await ensureAuth();
  const qs = params
    ? '?' +
      new URLSearchParams(
        Object.fromEntries(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k, v]) => [k, String(v)]),
        ),
      ).toString()
    : '';
  const res = await fetch(`${BASE_URL}${path}${qs}`, {
    method,
    headers: {
      authorization: `Bearer ${state.accessToken}`,
      'x-client-type': 'mobile',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && !isRetry) {
    await refreshSession();
    return api(path, { method, body, params }, true);
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.message || json?.error || `HTTP ${res.status}`;
    throw new Error(`Backend trả lỗi: ${Array.isArray(msg) ? msg.join('; ') : msg}`);
  }
  return unwrap(json);
}

function asText(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

const server = new McpServer({ name: 'yeu-author', version: '1.0.0' });

// ─── Auth ────────────────────────────────────────────────────────────────

server.registerTool(
  'login',
  {
    title: 'Đăng nhập YÊU',
    description:
      'Đăng nhập bằng email/username + mật khẩu. Bỏ trống cả hai tham số để dùng YEU_EMAIL/YEU_PASSWORD từ env. Token giữ trong phiên MCP, các tool khác tự dùng.',
    inputSchema: {
      emailOrUsername: z.string().optional().describe('Email hoặc username; bỏ trống = dùng env'),
      password: z.string().optional().describe('Mật khẩu; bỏ trống = dùng env'),
    },
  },
  async ({ emailOrUsername, password }) => {
    const email = emailOrUsername || process.env.YEU_EMAIL;
    const pass = password || process.env.YEU_PASSWORD;
    if (!email || !pass) {
      throw new Error('Thiếu thông tin đăng nhập — truyền tham số hoặc đặt env YEU_EMAIL/YEU_PASSWORD.');
    }
    const user = await doLogin(email, pass);
    return asText({ message: 'Đăng nhập thành công', user });
  },
);

server.registerTool(
  'whoami',
  {
    title: 'Thông tin tài khoản hiện tại',
    description: 'Trả về profile của user đang đăng nhập (id, username, displayName, role).',
    inputSchema: {},
  },
  async () => asText(await api('/auth/me')),
);

// ─── Truyện ──────────────────────────────────────────────────────────────

server.registerTool(
  'list_my_stories',
  {
    title: 'Danh sách truyện của tôi',
    description:
      'Liệt kê truyện do user đang đăng nhập sáng tác (mọi trạng thái: draft, chờ duyệt, đã xuất bản). Trả về id, title, slug, status, số liệu.',
    inputSchema: {
      page: z.number().int().min(1).optional().describe('Trang, mặc định 1'),
      limit: z.number().int().min(1).max(100).optional().describe('Số dòng mỗi trang, mặc định 20'),
    },
  },
  async ({ page, limit }) => asText(await api('/stories/me/list', { params: { page, limit } })),
);

server.registerTool(
  'get_story',
  {
    title: 'Chi tiết truyện',
    description: 'Lấy chi tiết một truyện theo slug hoặc id (mô tả, thể loại, trạng thái, số chương).',
    inputSchema: {
      slugOrId: z.string().min(1).describe('Slug hoặc id của truyện'),
    },
  },
  async ({ slugOrId }) => asText(await api(`/stories/${encodeURIComponent(slugOrId)}`)),
);

server.registerTool(
  'create_story',
  {
    title: 'Tạo truyện mới',
    description:
      'Tạo truyện mới (mặc định là bản nháp, chưa xuất bản). Slug sinh tự động từ tiêu đề.',
    inputSchema: {
      title: z.string().min(1).max(200).describe('Tiêu đề truyện'),
      description: z.string().max(5000).optional().describe('Giới thiệu truyện'),
      tags: z.array(z.string()).optional().describe('Danh sách tag'),
      categoryIds: z.array(z.string()).optional().describe('ID thể loại (xem GET /categories)'),
    },
  },
  async (input) => asText(await api('/stories', { method: 'POST', body: input })),
);

// ─── Chương ──────────────────────────────────────────────────────────────

server.registerTool(
  'list_chapters',
  {
    title: 'Danh sách chương của truyện',
    description: 'Liệt kê toàn bộ chương của một truyện theo thứ tự (id, title, slug, order, isPublished).',
    inputSchema: {
      storySlug: z.string().min(1).describe('Slug (hoặc id) của truyện'),
    },
  },
  async ({ storySlug }) =>
    asText(await api(`/stories/${encodeURIComponent(storySlug)}/chapters`)),
);

server.registerTool(
  'get_chapter',
  {
    title: 'Đọc nội dung một chương',
    description: 'Lấy đầy đủ nội dung một chương theo slug chương.',
    inputSchema: {
      storySlug: z.string().min(1).describe('Slug của truyện'),
      chapterSlug: z.string().min(1).describe('Slug của chương'),
    },
  },
  async ({ storySlug, chapterSlug }) =>
    asText(
      await api(
        `/stories/${encodeURIComponent(storySlug)}/chapters/${encodeURIComponent(chapterSlug)}`,
      ),
    ),
);

server.registerTool(
  'create_chapter',
  {
    title: 'Tạo chương mới',
    description:
      'Tạo chương mới cho truyện của user (mặc định chưa xuất bản). Nội dung là HTML đơn giản — mỗi đoạn văn bọc trong thẻ <p>...</p> (cùng định dạng editor Quill của web).',
    inputSchema: {
      storySlug: z.string().min(1).describe('Slug của truyện'),
      title: z.string().min(1).max(200).describe('Tiêu đề chương, VD "Chương 12: Tái ngộ"'),
      content: z.string().min(1).describe('Nội dung chương — HTML, mỗi đoạn trong <p>'),
      order: z.number().int().min(1).optional().describe('Số thứ tự chương; bỏ trống = tiếp theo'),
      price: z.number().int().min(0).optional().describe('Giá xu để mở khoá (0 = miễn phí)'),
    },
  },
  async ({ storySlug, ...body }) =>
    asText(await api(`/stories/${encodeURIComponent(storySlug)}/chapters`, { method: 'POST', body })),
);

server.registerTool(
  'update_chapter',
  {
    title: 'Sửa chương / thêm nội dung',
    description:
      'Cập nhật tiêu đề, nội dung hoặc giá của một chương. Lưu ý: `content` GHI ĐÈ toàn bộ — muốn viết tiếp thì get_chapter lấy nội dung cũ, nối thêm rồi gửi lại.',
    inputSchema: {
      storySlug: z.string().min(1).describe('Slug của truyện'),
      chapterId: z.string().min(1).describe('ID của chương (lấy từ list_chapters)'),
      title: z.string().min(1).max(200).optional(),
      content: z.string().min(1).optional().describe('Nội dung mới — ghi đè toàn bộ'),
      price: z.number().int().min(0).optional(),
    },
  },
  async ({ storySlug, chapterId, ...body }) =>
    asText(
      await api(
        `/stories/${encodeURIComponent(storySlug)}/chapters/${encodeURIComponent(chapterId)}`,
        { method: 'PATCH', body },
      ),
    ),
);

server.registerTool(
  'publish_chapter',
  {
    title: 'Xuất bản / gỡ xuất bản chương',
    description:
      'publish=true để xuất bản chương cho độc giả, publish=false để gỡ. Chỉ làm khi user yêu cầu rõ ràng.',
    inputSchema: {
      storySlug: z.string().min(1).describe('Slug của truyện'),
      chapterId: z.string().min(1).describe('ID của chương'),
      publish: z.boolean().describe('true = xuất bản, false = gỡ xuất bản'),
    },
  },
  async ({ storySlug, chapterId, publish }) =>
    asText(
      await api(
        `/stories/${encodeURIComponent(storySlug)}/chapters/${encodeURIComponent(chapterId)}/${publish ? 'publish' : 'unpublish'}`,
        { method: 'POST' },
      ),
    ),
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[mcp-author] sẵn sàng — backend: ${BASE_URL}`);
