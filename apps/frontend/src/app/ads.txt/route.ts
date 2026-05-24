/**
 * Serve `/ads.txt` cho Google AdSense verify. Nội dung lấy từ
 * `Settings.adsTxtContent` qua backend endpoint `/api/ads/ads-txt-content`.
 * Cache 1 giờ ở edge để không hammer backend.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET() {
    const backendUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');

    let content = '';
    try {
        const res = await fetch(`${backendUrl}/api/ads/ads-txt-content`, {
            // Backend trả JSON { content: string }. Cache 1 giờ.
            next: { revalidate: 3600 },
        });
        if (res.ok) {
            const body = await res.json();
            content = body?.data?.content ?? body?.content ?? '';
        }
    } catch {
        // Backend không reachable — trả rỗng để Google không crash, admin sẽ
        // thấy log + thử lại sau.
    }

    return new Response(content, {
        status: 200,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
        },
    });
}
