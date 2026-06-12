/**
 * Generate a URL-friendly slug from a string.
 *
 * Hỗ trợ tiếng Việt có dấu: chuẩn hoá NFD để tách dấu khỏi chữ cái rồi xoá
 * các combining marks (U+0300–U+036F), riêng đ/Đ không decompose được nên
 * thay thủ công. Ví dụ: "Truyện Tiên Hiệp Đỉnh Cao" → "truyen-tien-hiep-dinh-cao".
 */
export function generateSlug(text: string): string {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Remove diacritical marks (dấu thanh + dấu mũ)
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '') // Keep letters/digits (kể cả CJK), spaces, hyphens
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

  // Tiêu đề toàn ký tự đặc biệt → fallback để generateUniqueSlug còn đánh số.
  return slug || 'untitled';
}

/**
 * Generate a unique slug by appending a number if needed
 */
export async function generateUniqueSlug(
  baseSlug: string,
  checkExists: (slug: string) => Promise<boolean>,
  maxAttempts: number = 100
): Promise<string> {
  let slug = baseSlug;
  let attempt = 0;

  while (await checkExists(slug) && attempt < maxAttempts) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  if (attempt >= maxAttempts) {
    throw new Error(`Unable to generate unique slug after ${maxAttempts} attempts`);
  }

  return slug;
}
