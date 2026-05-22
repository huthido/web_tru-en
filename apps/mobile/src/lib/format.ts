/** Small display-formatting helpers shared across screens. */

/** 1234 → "1.2K", 2_500_000 → "2.5M". */
export function formatCount(n?: number | null): string {
    const v = n ?? 0;
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(v);
}

/** Coin/score with thousands separators: 12345 → "12.345". */
export function formatNumber(n?: number | null): string {
    return (n ?? 0).toLocaleString('vi-VN');
}

export function formatRating(r?: number | null): string {
    return (r ?? 0).toFixed(1);
}

/** ISO timestamp → relative Vietnamese string ("3 giờ trước"). */
export function timeAgo(iso?: string | null): string {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return '';
    const diffMin = Math.floor((Date.now() - t) / 60_000);
    if (diffMin < 1) return 'vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    const hours = Math.floor(diffMin / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ngày trước`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} tháng trước`;
    return `${Math.floor(months / 12)} năm trước`;
}

const STATUS_LABEL: Record<string, string> = {
    ONGOING: 'Đang ra',
    COMPLETED: 'Hoàn thành',
    PUBLISHED: 'Đang ra',
    DRAFT: 'Bản nháp',
    ARCHIVED: 'Lưu trữ',
};

export function storyStatusLabel(status?: string): string {
    return STATUS_LABEL[status ?? ''] ?? status ?? '';
}
