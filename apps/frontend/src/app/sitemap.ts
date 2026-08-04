import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo/site-url';
import { serverGet, mapWithConcurrency } from '@/lib/api/server-api';
import { isIndexableStory, MIN_CHAPTERS_TO_INDEX } from '@/lib/seo/indexing';

// Sitemap được dựng lại mỗi giờ để truyện/chương mới xuất hiện mà không cần build lại.
export const revalidate = 3600;

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

/** Lấy toàn bộ truyện đã xuất bản (phân trang tới hết). */
async function getAllStories(): Promise<SitemapStory[]> {
  const all: SitemapStory[] = [];
  const limit = 100;

  for (let page = 1; page <= 100; page++) {
    const payload = await serverGet<{ data: SitemapStory[]; meta?: { total?: number } }>(
      `/stories?page=${page}&limit=${limit}`,
      { revalidate }
    );

    const stories = Array.isArray(payload?.data) ? payload!.data : [];
    if (stories.length === 0) break;

    all.push(...stories);

    const total = payload?.meta?.total ?? 0;
    if (stories.length < limit || (total > 0 && all.length >= total)) break;
  }

  return all;
}

async function getChapters(storySlug: string): Promise<SitemapChapter[]> {
  const payload = await serverGet<SitemapChapter[] | { data: SitemapChapter[] }>(
    `/stories/${storySlug}/chapters`,
    { revalidate }
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
