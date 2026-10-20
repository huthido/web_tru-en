import { ImageResponse } from 'next/og';
import { getStoryServer } from '@/lib/api/server-stories';

/**
 * Ảnh chia sẻ (Facebook/Zalo/X…) 1200×630 cho trang truyện: bìa + tên truyện +
 * tác giả + thể loại. Trước đây dùng thẳng ảnh bìa dọc 600×800 nên bị cắt xấu
 * trong khung ngang. File-based metadata này ưu tiên hơn openGraph.images ở
 * layout và áp dụng cả cho trang chương con.
 */
export const runtime = 'nodejs';
export const revalidate = 3600;
export const alt = 'Truyện trên YÊU';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BG = '#0b1326';
const ACCENT = '#ff8fb1';

/** Font có dấu tiếng Việt (Be Vietnam Pro) — Google Fonts trả TTF khi lọc theo `text`. */
async function loadFont(text: string, weight: number): Promise<ArrayBuffer | null> {
    try {
        const cssUrl = `https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@${weight}&text=${encodeURIComponent(text)}`;
        const css = await (await fetch(cssUrl, { next: { revalidate: 86400 } })).text();
        const match = css.match(/src: url\(([^)]+)\) format\('(opentype|truetype)'\)/);
        if (!match) return null;
        const res = await fetch(match[1], { next: { revalidate: 86400 } });
        return res.ok ? await res.arrayBuffer() : null;
    } catch {
        return null;
    }
}

/** Tải ảnh bìa (thường là WebP — Satori không đọc được) → PNG data URL bằng sharp. */
async function loadCover(url?: string | null): Promise<string | null> {
    if (!url || !/^https?:\/\//.test(url)) return null;
    try {
        const res = await fetch(url, { next: { revalidate: 86400 } });
        if (!res.ok) return null;
        const input = Buffer.from(await res.arrayBuffer());
        if (input.length > 8 * 1024 * 1024) return null;
        const sharp = (await import('sharp')).default;
        const png = await sharp(input).resize(360, 480, { fit: 'cover' }).png().toBuffer();
        return `data:image/png;base64,${png.toString('base64')}`;
    } catch {
        return null;
    }
}

function clip(text: string, max: number) {
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default async function StoryOgImage({ params }: { params: { slug: string } }) {
    const story = await getStoryServer(params.slug);
    const title = clip(story?.title || 'YÊU — Đọc & nghe truyện', 70);
    const author = story ? story.authorName || story.author?.displayName || story.author?.username || '' : '';
    const genres = (story?.storyCategories || [])
        .map((sc: any) => sc?.category?.name)
        .filter(Boolean)
        .slice(0, 3) as string[];
    // Font không có glyph ★ → vẽ ngôi sao bằng SVG, chỉ để số ở đây.
    const chapterInfo = story?.ratingCount ? Number(story.rating || 0).toFixed(1) : '';

    const allText = `${title}${author}${genres.join('')}YÊU yeuyeu.net Đọc & nghe truyện miễn phí bởi 0123456789.…·`;
    const [cover, bold, regular] = await Promise.all([
        loadCover(story?.coverImage),
        loadFont(allText, 800),
        loadFont(allText, 500),
    ]);
    const fonts = [
        ...(bold ? [{ name: 'BVP', data: bold, weight: 800 as const, style: 'normal' as const }] : []),
        ...(regular ? [{ name: 'BVP', data: regular, weight: 500 as const, style: 'normal' as const }] : []),
    ];

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    background: `linear-gradient(135deg, ${BG} 0%, #1d2a4d 100%)`,
                    color: '#fff',
                    fontFamily: fonts.length ? 'BVP' : 'sans-serif',
                    padding: 60,
                    alignItems: 'center',
                }}
            >
                {cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={cover}
                        width={360}
                        height={480}
                        alt=""
                        style={{ borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', marginRight: 56 }}
                    />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
                    <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: ACCENT, marginBottom: 20 }}>YÊU</div>
                    <div style={{ display: 'flex', fontSize: title.length > 40 ? 54 : 66, fontWeight: 800, lineHeight: 1.15 }}>
                        {title}
                    </div>
                    {author && (
                        <div style={{ display: 'flex', fontSize: 30, fontWeight: 500, color: '#c9d2ea', marginTop: 22 }}>
                            bởi {clip(author, 40)}
                        </div>
                    )}
                    {(genres.length > 0 || chapterInfo) && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: 28 }}>
                            {chapterInfo && (
                                <div style={{ display: 'flex', fontSize: 24, padding: '8px 18px', borderRadius: 999, background: ACCENT, color: BG, fontWeight: 800, marginRight: 12, marginBottom: 10, alignItems: 'center' }}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" style={{ marginRight: 8 }}>
                                        <path fill={BG} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                    </svg>
                                    {chapterInfo}
                                </div>
                            )}
                            {genres.map((g) => (
                                <div key={g} style={{ display: 'flex', fontSize: 24, padding: '8px 18px', borderRadius: 999, background: 'rgba(255,255,255,0.12)', marginRight: 12, marginBottom: 10 }}>
                                    {g}
                                </div>
                            ))}
                        </div>
                    )}
                    <div style={{ display: 'flex', fontSize: 22, color: '#8f9bbd', marginTop: 'auto', paddingTop: 30 }}>
                        Đọc &amp; nghe truyện miễn phí · yeuyeu.net
                    </div>
                </div>
            </div>
        ),
        { ...size, fonts: fonts.length ? fonts : undefined },
    );
}
