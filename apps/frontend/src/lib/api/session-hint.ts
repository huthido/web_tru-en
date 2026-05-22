/**
 * Cờ gợi ý phiên đăng nhập (client-side).
 *
 * Cookie auth là httpOnly nên JavaScript không đọc được → không có cách nào
 * biết trước người dùng đã đăng nhập hay chưa. Ta lưu một cờ trong localStorage
 * mỗi khi đăng nhập thành công, và xoá khi đăng xuất / phiên hết hạn.
 *
 * Nhờ cờ này, app chỉ gọi `/auth/me` khi CÓ KHẢ NĂNG đang có phiên. Khách
 * vãng lai (không có cờ) bỏ qua hẳn request đó → trình duyệt không log dòng
 * `GET /api/auth/me 401` đỏ trong console nữa.
 */
const KEY = 'yeu_has_session';

/** True nếu trình duyệt này từng đăng nhập (có thể đang có phiên hợp lệ). */
export function hasSessionHint(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    // localStorage có thể bị chặn (chế độ riêng tư) — coi như không có cờ.
    return false;
  }
}

/** Bật cờ khi đăng nhập thành công, tắt khi đăng xuất / phiên hết hạn. */
export function setSessionHint(active: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (active) window.localStorage.setItem(KEY, '1');
    else window.localStorage.removeItem(KEY);
  } catch {
    /* localStorage bị chặn — bỏ qua, app vẫn chạy bình thường. */
  }
}
