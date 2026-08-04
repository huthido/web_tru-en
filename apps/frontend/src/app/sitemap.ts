import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo/site-url';
import { serverGet } from '@/lib/api/server-api';
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

/** Một truyện kèm slug các chương đã đăng — hình dạng của /stories/sitemap-data. */
type SitemapStory = {
  slug: string;
  updatedAt?: string;
  lastChapterAt?: string;
  chapters: SitemapChapter[];
};

type SitemapChapter = {
  slug: string;
  updatedAt?: string;
  createdAt?: string;
};

/**
 * Lấy toàn bộ dữ liệu sitemap trong MỘT lời gọi.
 *
 * Bản trước tự ghép: phân trang /stories rồi gọi /stories/:slug/chapters cho
 * từng truyện — 129 request mỗi lần dựng sitemap. Backend có throttler 100
 * request/phút nên nó tự đá chính mình bằng 429, và vì `serverGet` nuốt lỗi
 * thành null, sitemap âm thầm mất truyện: đã đo được lúc chỉ còn 1.443 URL thay
 * vì 1.622. Chưa kể mỗi lời gọi /chapters trả về đầy đủ nội dung chương, tức
 * tải vài MB văn bản chỉ để đọc lấy cái slug.
 *
 * Thất bại thì NÉM LỖI chứ không trả mảng rỗng: nộp sitemap cụt còn hại hơn
 * không nộp, vì Google rút những URL không còn được liệt kê ra khỏi chỉ mục.
 * Trả 5xx thì Google giữ bản tốt lần trước rồi thử lại.
 */
async function getSitemapStories(): Promise<SitemapStory[]> {
  const payload = await serverGet<SitemapStory[]>('/stories/sitemap-data', {
    revalidate: SITEMAP_REVALIDATE,
  });

  if (!Array.isArray(payload)) {
    throw new Error(
      '[sitemap] /stories/sitemap-data không trả về mảng — không phát sitemap cụt. ' +
        'Kiểm tra INTERNAL_API_URL và phiên bản backend đang chạy.'
    );
  }

  return payload;
}

function toDate(value?: string): Date {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

/**
 * Mốc `lastmod` = mốc MỚI NHẤT trong các ứng viên, không phải ứng viên đầu tiên
 * có giá trị.
 *
 * Bản trước ưu tiên `lastChapterAt`, lý do là `updatedAt` của truyện đổi cả khi
 * tác giả chỉ sửa mô tả. Nhưng nó bỏ sót đúng trường hợp cần báo cho Google
 * nhất: đổi slug hàng loạt (82 truyện, 08/2026) chỉ đụng `updatedAt`, nên
 * `lastmod` đứng yên và Google không có lý do gì để crawl lại URL mới.
 */
function latestDate(...values: (string | undefined)[]): Date {
  const times = values
    .filter((v): v is string => Boolean(v))
    .map((v) => new Date(v).getTime())
    .filter((t) => !Number.isNaN(t));

  return times.length > 0 ? new Date(Math.max(...times)) : new Date();
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

  const stories = await getSitemapStories();

  if (stories.length === 0) {
    throw new Error(
      '[sitemap] API trả về 0 truyện — không phát sitemap cụt. ' +
        'Kiểm tra INTERNAL_API_URL và tình trạng backend.'
    );
  }

  // Đếm chương từ danh sách chương thật, KHÔNG dùng `_count.chapters`: `_count`
  // gộp cả chương chưa xuất bản và chương hẹn giờ. Ví dụ thật trên production —
  // `manh-dat-khong-giu-duoc-nguoi` báo `_count.chapters: 10` nhưng không có
  // chương nào công khai, vì cả 10 đều đang chờ tới giờ đăng.
  //
  // Truyện mỏng đã bị `noindex` ở layout; nếu vẫn nộp thì sitemap tự mâu thuẫn
  // với chính trang đích, Google ghi nhận đó là lỗi chất lượng chứ không bỏ qua.
  const indexable = stories.filter((story) =>
    isIndexableStory((story.chapters || []).length)
  );

  const storyUrls: MetadataRoute.Sitemap = indexable.map((story) => ({
    url: `${baseUrl}/truyen/${story.slug}`,
    lastModified: latestDate(
      story.lastChapterAt,
      story.chapters[story.chapters.length - 1]?.updatedAt,
      story.updatedAt
    ),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  // Chương mới là phần nội dung thật của site — trước đây không có URL chương nào
  // trong sitemap nên Google không biết chúng tồn tại.
  const chapterUrls: MetadataRoute.Sitemap = indexable.flatMap((story) =>
    story.chapters.map((chapter) => ({
      url: `${baseUrl}/truyen/${story.slug}/chuong/${chapter.slug}`,
      lastModified: toDate(chapter.updatedAt || chapter.createdAt),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  );

  const skipped = stories.length - indexable.length;
  if (skipped > 0) {
    console.log(
      `[sitemap] Bỏ qua ${skipped}/${stories.length} truyện có dưới ${MIN_CHAPTERS_TO_INDEX} chương công khai.`
    );
  }

  return [...staticPages, ...storyUrls, ...chapterUrls];
}
