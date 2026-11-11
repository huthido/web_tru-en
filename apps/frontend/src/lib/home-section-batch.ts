/**
 * Số truyện mỗi "trang" của lưới trang chủ. Dùng chung cho server prefetch
 * (app/page.tsx) và client (home-client.tsx) — hai bên PHẢI ra cùng một con số
 * thì query key mới khớp và trang không fetch lại sau khi hydrate.
 *
 * Mỗi trang = GẤP ĐÔI "Số lượng truyện" admin đặt cho section, chặn trên ở
 * 24 (màn nhỏ: lưới 2/3/4 cột) và 30 (xl: lưới 5 cột) để hàng cuối luôn đầy.
 * Bấm "Xem thêm" thì hiện thêm một trang nữa.
 */
export function homeSectionBatch(limit: number | null | undefined) {
  const base = Math.max(1, Math.floor(Number(limit)) || 15);
  return {
    mobile: Math.min(base, 12) * 2,
    desktop: Math.min(base, 15) * 2,
  };
}

/** Trần số truyện một section trả về — khớp `Math.min(limitNum, 150)` ở backend. */
export const HOME_SECTION_MAX = 150;
