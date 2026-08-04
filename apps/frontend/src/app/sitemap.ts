import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo/site-url';
import { serverGet, mapWithConcurrency } from '@/lib/api/server-api';
import { isIndexableStory, MIN_CHAPTERS_TO_INDEX } from '@/lib/seo/indexing';

/**
 * KHÔNG prerender sitemap lúc build.
 *
 * Trong `docker build`, container backend chưa chạy nên `serverGet` không gọi
 * được API và trả về null. Với ISR thường, Next sẽ nướng luôn kết quả rỗng đó
 * thành file tĩnh: sau khi deploy ngày 04/08/2026 sitemap chỉ còn 13 URL trang
 * tĩnh, `lastmod` đúng bằng giờ build, và phải chờ hết `revalidate` mới tự
 * dựng lại. Trong khoảng chờ đó sitemap đang nói dối Google rằng cả site chỉ
 * có 13 trang — tệ hơn hẳn việc không có sitemap.
 *
 * `force-dynamic` khiến route luôn dựng lúc có request. Chi phí không lớn vì
 * từng lời gọi `serverGet` vẫn qua Data Cache của Next (xem SITEMAP_REVALIDATE),
 * nên chỉ request đầu mỗi giờ mới thực sự đi hỏi backend.
 */
export const dynamic = 'force-dynamic';

/** TTL cache cho dữ liệu sitemap — không phải TTL của bản thân route. */
const SITEMAP_REVALIDATE = 3600;

type SitemapStory = {
  slug: string;
  updatedAt?: string;
  lastChapterAt?: string;
  _count?: { chapters?: number };
};

type SitemapChapter = {
  slug: string;
  updatedAt?: string;
  createdAt?: string;
};

/**
 * Gọi API và thử lại vài lần trước khi chịu thua.
 *
 * `serverGet` trả `null` cho mọi lỗi mạng — không phân biệt được "hỏng" với
 * "rỗng". Với sitemap, nhầm hai thứ đó là im lặng xoá URL khỏi chỉ mục, nên ở
 * đây thất bại phải ném lỗi chứ không được trả giá trị rỗng.
 */
async function fetchOrThrow<T>(path: string, attempts = 3): Promise<T> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const payload = await serverGet<T>(path, { revalidate: SITEMAP_REVALIDATE });
    if (payload !== null && payload !== undefined) return payload;

    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
  }

  throw new Error(`[sitemap] Gọi ${path} thất bại sau ${attempts} lần thử.`);
}

/** Lấy toàn bộ truyện đã xuất bản (phân trang tới hết). */
async function getAllStories(): Promise<SitemapStory[]> {
  const all: SitemapStory[] = [];
  const limit = 100;

  // Dừng theo `totalPages` do API trả về, KHÔNG suy đoán từ việc trang trả rỗng.
  // Bản trước dùng `if (stories.length === 0) break` nên một lần gọi trang 2 hỏng
  // là vòng lặp thoát êm và sitemap mất luôn 28 truyện — đã xảy ra thật ngày
  // 04/08/2026: sitemap chỉ còn 1.443 URL thay vì 1.622, toàn bộ 69 truyện có
  // trong đó đều thuộc trang 1.
  let totalPages = 1;

  for (let page = 1; page <= totalPages && page <= 100; page++) {
    const payload = await fetchOrThrow<{
      data: SitemapStory[];
      meta?: { total?: number; totalPages?: number };
    }>(`/stories?page=${page}&limit=${limit}`);

    const stories = Array.isArray(payload?.data) ? payload.data : [];
    all.push(...stories);

    if (page === 1) {
      totalPages = payload?.meta?.totalPages ?? 1;
    }
  }

  return all;
}

async function getChapters(storySlug: string): Promise<SitemapChapter[]> {
  // Chương hỏng một lần cũng đủ khiến truyện bị coi là "mỏng" rồi rơi khỏi
  // sitemap, nên ở đây cũng phải thử lại thay vì nuốt lỗi thành mảng rỗng.
  const payload = await fetchOrThrow<SitemapChapter[] | { data: SitemapChapter[] }>(
    `/stories/${storySlug}/chapters`
  );

  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray((payload as any).data)) return (payload as any).data;
  return [];
}

function toDate(value?: string): Date {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();

  // CHỈ liệt kê trang công khai. Trước đây sitemap còn có /thu-vien, /yeu-thich,
  // /dang-theo-doi, /lich-su — đều cần đăng nhập nên bot chỉ thấy trang rỗng.
  //
  // KHÔNG thêm vào đây:
  //   /cua-hang  — bọc <ProtectedRoute>, khách chưa đăng nhập chỉ thấy màn chờ
  //   /quang-cao — form đặt quảng cáo, client-only và không có nội dung để đọc
  const staticPages: MetadataRoute.Sitemap = ([
    { url: baseUrl, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/truyen`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/tranh`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/nghe-thuat`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/gioi-thieu`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/dieu-khoan`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/quyen-rieng-tu`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/ban-quyen`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/an-toan-tre-em`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/gop-y-phan-anh`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/lien-he-quang-cao`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/dang-ky-tac-gia`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${baseUrl}/doi-tac-hop-tac`, changeFrequency: 'monthly', priority: 0.3 },
  ] as const).map((page) => ({ ...page, lastModified: new Date() }));

  const stories = await getAllStories();

  // Backend không trả lời (hoặc trả rỗng) thì THÀ LỖI còn hơn nộp sitemap cụt.
  // `serverGet` nuốt lỗi mạng và trả null để trang thường vẫn render được ở
  // client — nhưng với sitemap, im lặng bỏ qua đồng nghĩa với việc khẳng định
  // với Google rằng site chỉ có mấy trang tĩnh, và Google sẽ rút những URL
  // không còn được liệt kê ra khỏi chỉ mục. Ném lỗi → Next trả 5xx → Google
  // giữ nguyên bản sitemap tốt lần trước rồi thử lại sau.
  if (stories.length === 0) {
    throw new Error(
      '[sitemap] Không lấy được truyện nào từ API — không phát sitemap cụt. ' +
        'Kiểm tra INTERNAL_API_URL và tình trạng backend.'
    );
  }

  // Số chương công khai phải lấy từ chính endpoint chương, KHÔNG dùng
  // `_count.chapters` của danh sách truyện: `_count` đếm cả chương chưa xuất bản
  // và chương hẹn giờ. Ví dụ thật trên production — `manh-dat-khong-giu-duoc-nguoi`
  // báo `_count.chapters: 10` nhưng API công khai trả về mảng rỗng, vì cả 10
  // chương đều đang chờ tới giờ đăng.
  const withChapters = await mapWithConcurrency(stories, 8, async (story) => ({
    story,
    chapters: await getChapters(story.slug),
  }));

  // Chỉ nộp truyện đủ chương. Truyện mỏng đã bị `noindex` ở layout, nếu vẫn nộp
  // thì sitemap tự mâu thuẫn với chính trang đích — Google ghi nhận đó là lỗi
  // chất lượng chứ không bỏ qua.
  const indexable = withChapters.filter(({ chapters }) => isIndexableStory(chapters.length));

  const storyUrls: MetadataRoute.Sitemap = indexable.map(({ story, chapters }) => ({
    url: `${baseUrl}/truyen/${story.slug}`,
    // Ưu tiên mốc thời gian của chương mới nhất: `updatedAt` của truyện đổi cả
    // khi tác giả chỉ sửa mô tả, không phản ánh nội dung mới.
    lastModified: toDate(
      story.lastChapterAt || chapters[chapters.length - 1]?.updatedAt || story.updatedAt
    ),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  // Chương mới là phần nội dung thật của site — trước đây không có URL chương nào
  // trong sitemap nên Google không biết chúng tồn tại.
  const chapterUrls: MetadataRoute.Sitemap = indexable.flatMap(({ story, chapters }) =>
    chapters.map((chapter) => ({
      url: `${baseUrl}/truyen/${story.slug}/chuong/${chapter.slug}`,
      lastModified: toDate(chapter.updatedAt || chapter.createdAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  );

  const skipped = withChapters.length - indexable.length;
  if (skipped > 0) {
    console.log(
      `[sitemap] Bỏ qua ${skipped}/${withChapters.length} truyện có dưới ${MIN_CHAPTERS_TO_INDEX} chương công khai.`
    );
  }

  return [...staticPages, ...storyUrls, ...chapterUrls];
}
