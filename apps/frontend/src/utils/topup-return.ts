/**
 * Nhớ chương người đọc đang bị khoá khi họ bấm "Nạp xu", để trang kết quả
 * thanh toán hiện nút quay lại đọc tiếp. localStorage (không phải
 * sessionStorage) vì VNPay có thể mở lại ở tab khác; hết hạn sau 1 ngày.
 */
const KEY = 'yeu_topup_return';
const TTL_MS = 24 * 60 * 60 * 1000;

export function saveTopupReturn(path: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() }));
  } catch { }
}

export function getTopupReturn(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { path, at } = JSON.parse(raw);
    // Chỉ chấp nhận path nội bộ (tránh open redirect).
    if (typeof path !== 'string' || path.charAt(0) !== '/' || path.charAt(1) === '/') return null;
    if (Date.now() - Number(at) > TTL_MS) return null;
    return path;
  } catch {
    return null;
  }
}

export function clearTopupReturn() {
  try {
    localStorage.removeItem(KEY);
  } catch { }
}
