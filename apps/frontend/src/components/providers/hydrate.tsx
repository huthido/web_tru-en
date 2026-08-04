'use client';

import { HydrationBoundary, type DehydratedState } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/**
 * Bọc `HydrationBoundary` trong một client component.
 *
 * KHÔNG import `HydrationBoundary` thẳng vào server component. Khi làm vậy,
 * webpack giải quyết `@tanstack/react-query` theo điều kiện của tầng server và
 * sinh ra một instance module khác với instance mà `QueryProvider` (file
 * 'use client') đang dùng. Hai instance có hai object React context riêng, nên
 * `HydrationBoundary` gọi `useQueryClient()` mà không thấy provider và ném
 * "No QueryClient set, use QueryClientProvider to set one" — kéo theo React
 * error #423, hydrate hỏng và cả trang rơi về client render.
 *
 * Lỗi này KHÔNG xuất hiện trong log SSR (server render vẫn ra HTML đầy đủ, mọi
 * route đều 200), chỉ nổ trong console trình duyệt lúc hydrate, nên phải mở
 * trang thật mới thấy.
 *
 * Đi qua file này thì `HydrationBoundary` và `QueryClientProvider` cùng được
 * import từ tầng client, chung một instance, chung một context.
 */
export function Hydrate({
  state,
  children,
}: {
  state: DehydratedState;
  children: ReactNode;
}) {
  return <HydrationBoundary state={state}>{children}</HydrationBoundary>;
}
