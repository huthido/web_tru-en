/**
 * Kệ "Đề xuất" trên trang chủ.
 *
 * Điểm gốc = chất lượng (sao, lượt xem, theo dõi, thích) + độ mới của chương.
 * Mỗi giờ Việt Nam nhân thêm một hệ số cố định theo id truyện rồi xếp lại.
 * Cùng một giờ mọi request ra cùng thứ tự: cache trang chủ và vài instance
 * backend không lệch nhau, bấm tải lại không nhảy vị trí. Sang giờ sau thì
 * cả vị trí lẫn một phần danh sách đổi.
 * Cờ isRecommended (admin) nhân điểm để truyện đó lọt kệ thường hơn, không
 * ghim cứng lên đầu. Tối đa 2 truyện cùng tác giả để một người không chiếm cả hàng.
 */

const HOUR_MS = 60 * 60 * 1000;
const VN_OFFSET_MS = 7 * HOUR_MS;

/** Hệ số nhân nằm trong [1-N, 1+N]. 0.55 đổi khoảng một nửa suất mỗi giờ. */
const NOISE = 0.55;
/** Truyện admin đánh dấu đề xuất. */
const EDITOR_BOOST = 2;
const MAX_PER_AUTHOR = 2;
/** recency = exp(-ngày / 20) → còn khoảng một nửa sau 14 ngày không có chương mới. */
const RECENCY_TAU_DAYS = 20;

export type RecommendInput = {
  id: string;
  authorId: string;
  viewCount: number;
  followCount: number;
  likeCount: number;
  rating: number;
  ratingCount: number;
  isRecommended?: boolean | null;
  lastChapterAt?: Date | string | null;
  publishedAt?: Date | string | null;
  createdAt: Date | string;
};

/** Số giờ Việt Nam kể từ epoch. Cùng giờ → cùng kệ. */
export function recommendHourBucket(now: number): number {
  return Math.floor((now + VN_OFFSET_MS) / HOUR_MS);
}

/** Hash ổn định [0, 1) từ khung giờ + id. Không dùng Math.random. */
function unitHash(bucket: number, id: string): number {
  let h = bucket >>> 0;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 0x9e3779b1);
  }
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function activityMs(story: RecommendInput): number {
  const raw = story.lastChapterAt ?? story.publishedAt ?? story.createdAt;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function baseScore(
  story: RecommendInput,
  maxes: { views: number; follows: number; likes: number },
  now: number,
): number {
  const votes = story.ratingCount || 0;
  const priorMean = 3.2;
  const priorWeight = 5;
  const blended =
    votes > 0
      ? (story.rating * votes + priorMean * priorWeight) / (votes + priorWeight)
      : priorMean;
  const ratingScore = (Math.min(5, Math.max(0, blended)) / 5) * 100;

  const logNorm = (value: number, max: number) =>
    max > 0 ? (Math.log1p(Math.max(0, value)) / Math.log1p(max)) * 100 : 0;

  const ageDays = Math.max(0, (now - activityMs(story)) / 86_400_000);
  const recency = 100 * Math.exp(-ageDays / RECENCY_TAU_DAYS);

  const quality =
    ratingScore * 0.34 +
    logNorm(story.viewCount, maxes.views) * 0.18 +
    logNorm(story.followCount, maxes.follows) * 0.14 +
    logNorm(story.likeCount, maxes.likes) * 0.08 +
    recency * 0.26;

  return story.isRecommended ? quality * EDITOR_BOOST : quality;
}

/**
 * Chọn `limit` truyện cho kệ Đề xuất tại thời điểm `now`.
 * Trả về đúng object đầu vào (giữ field card), thứ tự là thứ tự hiển thị.
 */
export function selectRecommended<T extends RecommendInput>(
  stories: T[],
  limit: number,
  now = Date.now(),
): T[] {
  if (limit <= 0 || stories.length === 0) return [];

  const maxes = {
    views: 1,
    follows: 1,
    likes: 1,
  };
  for (const story of stories) {
    if (story.viewCount > maxes.views) maxes.views = story.viewCount;
    if (story.followCount > maxes.follows) maxes.follows = story.followCount;
    if (story.likeCount > maxes.likes) maxes.likes = story.likeCount;
  }

  const bucket = recommendHourBucket(now);
  const ranked = stories
    .map((story) => {
      const score = baseScore(story, maxes, now);
      const factor = 1 - NOISE + 2 * NOISE * unitHash(bucket, story.id);
      return { story, noisy: score * factor };
    })
    .sort((a, b) => b.noisy - a.noisy || (a.story.id < b.story.id ? -1 : 1));

  const picked: T[] = [];
  const perAuthor = new Map<string, number>();
  const deferred: T[] = [];
  for (const { story } of ranked) {
    if (picked.length >= limit) break;
    const used = perAuthor.get(story.authorId) ?? 0;
    if (used >= MAX_PER_AUTHOR) {
      deferred.push(story);
      continue;
    }
    picked.push(story);
    perAuthor.set(story.authorId, used + 1);
  }
  for (const story of deferred) {
    if (picked.length >= limit) break;
    picked.push(story);
  }
  return picked;
}
