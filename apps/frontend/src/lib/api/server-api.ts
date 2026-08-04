/**
 * Gọi API từ phía server (server component, sitemap, generateMetadata).
 *
 * Dùng `fetch` chứ không dùng apiClient/axios để tận dụng cache của Next
 * (`next: { revalidate }`) và không kéo theo interceptor phía client.
 *
 * Ưu tiên INTERNAL_API_URL (Docker network) → NEXT_PUBLIC_API_URL, giống
 * server-settings.ts, để SSR không phải đi vòng qua HTTPS public.
 */

const API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : '');

const BASE_URL = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;

/** Bóc envelope { success, data, timestamp } của backend. */
function unwrap<T>(body: any): T {
  if (
    body &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    'success' in body &&
    'data' in body
  ) {
    return body.data as T;
  }
  return body as T;
}

export async function serverGet<T = any>(
  path: string,
  options: { revalidate?: number } = {}
): Promise<T | null> {
  if (!API_URL) return null;

  const { revalidate = 300 } = options;

  try {
    const response = await fetch(`${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate },
    });

    if (!response.ok) return null;

    return unwrap<T>(await response.json());
  } catch {
    // Backend chưa sẵn sàng (build time, container chưa khởi động…) — để trang
    // tự xoay xở ở client thay vì làm hỏng cả lượt render.
    return null;
  }
}

/** Chạy các tác vụ theo lô để không bắn hàng trăm request cùng lúc vào backend. */
export async function mapWithConcurrency<TIn, TOut>(
  items: TIn[],
  limit: number,
  worker: (item: TIn) => Promise<TOut>
): Promise<TOut[]> {
  const results: TOut[] = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  });

  await Promise.all(runners);
  return results;
}
