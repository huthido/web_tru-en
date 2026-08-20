'use client';

import { useEffect, useState } from 'react';

/**
 * Kích thước trang theo màn hình: màn hình lớn (breakpoint xl ≥1280px,
 * lưới 6 cột) dùng `large`, nhỏ hơn dùng `small`. Đổi kích thước qua mốc
 * sẽ cập nhật limit → React Query tự refetch.
 */
export function usePageLimit(small = 20, large = 24): number {
  const query = '(min-width: 1280px)';
  const [limit, setLimit] = useState(small);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setLimit(e.matches ? large : small);
    setLimit(mql.matches ? large : small);
    // Safari < 14 chưa có addEventListener trên MediaQueryList — phải dùng
    // addListener cũ, không thì iOS 12 ném TypeError sập trang.
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [small, large]);

  return limit;
}
