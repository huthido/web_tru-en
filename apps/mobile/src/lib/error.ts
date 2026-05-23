/**
 * Pull a human-readable message out of whatever object react-query / axios
 * surfaced. Tries (in order): backend error body, backend message body,
 * axios `error.message`, then `String(err)`.
 */
export function describeError(err: unknown): string {
    if (!err) return 'Đã có lỗi xảy ra';
    const e = err as {
        response?: { data?: { error?: string; message?: string }; status?: number };
        message?: string;
        code?: string;
    };
    if (e.response?.data?.error) return String(e.response.data.error);
    if (e.response?.data?.message) return String(e.response.data.message);
    if (e.code === 'ERR_NETWORK') return 'Không kết nối được máy chủ. Kiểm tra mạng / EXPO_PUBLIC_API_URL.';
    if (e.response?.status) return `Máy chủ trả lỗi (${e.response.status}).`;
    if (e.message) return e.message;
    try {
        return String(err);
    } catch {
        return 'Đã có lỗi xảy ra';
    }
}
