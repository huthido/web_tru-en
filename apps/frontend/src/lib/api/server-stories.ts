/**
 * Đọc truyện/chương từ phía server để:
 *  - sinh metadata (title, description, canonical, og),
 *  - nạp sẵn dữ liệu vào react-query cache trước khi render (HydrationBoundary),
 *    nhờ đó HTML trả về đã có nội dung thật thay vì spinner.
 */
import { serverGet } from './server-api';
import type { Story } from './stories.service';
import type { Chapter } from './chapters.service';

const STORY_REVALIDATE = 300; // 5 phút
const CHAPTER_REVALIDATE = 600; // 10 phút

export async function getStoryServer(slug: string): Promise<Story | null> {
  if (!slug) return null;
  const story = await serverGet<Story>(`/stories/${slug}`, { revalidate: STORY_REVALIDATE });
  return story && (story as any).id ? story : null;
}

export async function getChaptersServer(slug: string): Promise<Chapter[]> {
  if (!slug) return [];
  const payload = await serverGet<Chapter[] | { data: Chapter[] }>(
    `/stories/${slug}/chapters`,
    { revalidate: STORY_REVALIDATE }
  );

  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray((payload as any).data)) return (payload as any).data;
  return [];
}

export async function getChapterServer(
  storySlug: string,
  chapterSlug: string
): Promise<Chapter | null> {
  if (!storySlug || !chapterSlug) return null;
  const chapter = await serverGet<Chapter>(
    `/stories/${storySlug}/chapters/${chapterSlug}`,
    { revalidate: CHAPTER_REVALIDATE }
  );
  return chapter && (chapter as any).id ? chapter : null;
}

/** Bỏ thẻ HTML để lấy phần chữ dùng cho meta description. */
export function toPlainText(html?: string | null): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncate(text: string, max: number = 160): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 3).trimEnd()}...`;
}
