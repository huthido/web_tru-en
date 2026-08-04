/**
 * Ngưỡng quyết định một truyện có đáng đưa vào chỉ mục tìm kiếm hay không.
 *
 * Đo trên production ngày 04/08/2026: 163 truyện đã xuất bản, nhưng 35 truyện
 * không có chương công khai nào (khách vào thấy trang trắng) và 45 truyện chỉ
 * có 1–2 chương. Tức gần một nửa trang truyện là vỏ rỗng hoặc quá mỏng — đúng
 * thứ Google gọi là "thin content" và AdSense từ chối với lý do "Nội dung có
 * giá trị thấp".
 *
 * Hằng số này phải được dùng ở CẢ HAI nơi:
 *   - `truyen/[slug]/layout.tsx` — quyết định thẻ `robots: noindex`
 *   - `sitemap.ts`               — quyết định có nộp URL cho Google không
 *
 * Nếu hai nơi lệch nhau sẽ sinh ra lỗi tệ nhất: sitemap mời Google vào một URL
 * mà chính trang đó lại bảo "đừng index tôi".
 */
export const MIN_CHAPTERS_TO_INDEX = 3;

/** Truyện có đủ chương công khai để đáng lên chỉ mục / vào sitemap chưa? */
export function isIndexableStory(publishedChapterCount: number): boolean {
  return publishedChapterCount >= MIN_CHAPTERS_TO_INDEX;
}
