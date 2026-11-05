import { recommendHourBucket, selectRecommended, RecommendInput } from './recommend-rotation';

function story(partial: Partial<RecommendInput> & Pick<RecommendInput, 'id'>): RecommendInput {
  return {
    authorId: `author-${partial.id}`,
    viewCount: 100,
    followCount: 20,
    likeCount: 10,
    rating: 4,
    ratingCount: 12,
    isRecommended: false,
    lastChapterAt: new Date('2026-11-01T00:00:00Z'),
    publishedAt: new Date('2026-10-01T00:00:00Z'),
    createdAt: new Date('2026-09-01T00:00:00Z'),
    ...partial,
  };
}

const NOON = Date.parse('2026-11-05T05:00:00Z'); // 12:00 giờ Việt Nam

describe('selectRecommended', () => {
  const shelf = Array.from({ length: 12 }, (_, i) =>
    story({ id: `s${i}`, viewCount: 100 + i, authorId: `a${i}` }),
  );

  it('giữ nguyên thứ tự trong cùng một giờ Việt Nam', () => {
    const at0730 = Date.parse('2026-01-01T00:30:00Z');
    const at0759 = Date.parse('2026-01-01T00:59:00Z');
    expect(recommendHourBucket(at0730)).toBe(recommendHourBucket(at0759));
    expect(selectRecommended(shelf, 8, at0730).map((s) => s.id)).toEqual(
      selectRecommended(shelf, 8, at0759).map((s) => s.id),
    );
  });

  it('đổi thứ tự khi sang giờ sau', () => {
    const at0700 = Date.parse('2026-01-01T00:00:00Z');
    const at0800 = Date.parse('2026-01-01T01:00:00Z');
    expect(recommendHourBucket(at0800)).toBe(recommendHourBucket(at0700) + 1);
    const before = selectRecommended(shelf, 8, at0700).map((s) => s.id);
    const after = selectRecommended(shelf, 8, at0800).map((s) => s.id);
    expect(after).not.toEqual(before);
  });

  it('truyện đang nóng xuất hiện nhiều hơn truyện bỏ hoang', () => {
    const hot = story({
      id: 'hot',
      authorId: 'hot-author',
      rating: 4.8,
      ratingCount: 80,
      viewCount: 8000,
      followCount: 600,
      likeCount: 300,
      lastChapterAt: new Date(NOON),
    });
    const cold = story({
      id: 'cold',
      authorId: 'cold-author',
      rating: 0,
      ratingCount: 0,
      viewCount: 0,
      followCount: 0,
      likeCount: 0,
      lastChapterAt: new Date(NOON - 400 * 86_400_000),
    });
    const filler = Array.from({ length: 20 }, (_, i) =>
      story({
        id: `f${i}`,
        authorId: `fa${i}`,
        rating: 3.5,
        ratingCount: 8,
        viewCount: 200,
        lastChapterAt: new Date(NOON - 30 * 86_400_000),
      }),
    );
    const catalog = [hot, cold, ...filler];
    let hotHours = 0;
    let coldHours = 0;
    for (let h = 0; h < 48; h++) {
      const ids = selectRecommended(catalog, 10, NOON + h * 3_600_000).map((s) => s.id);
      if (ids.includes('hot')) hotHours++;
      if (ids.includes('cold')) coldHours++;
    }
    expect(hotHours).toBeGreaterThan(coldHours);
    expect(hotHours).toBeGreaterThan(30);
  });

  it('không để một tác giả chiếm quá 2 suất khi còn tác giả khác', () => {
    const dominant = Array.from({ length: 6 }, (_, i) =>
      story({
        id: `dom${i}`,
        authorId: 'same',
        viewCount: 9000 - i,
        rating: 5,
        ratingCount: 40,
      }),
    );
    const others = Array.from({ length: 4 }, (_, i) =>
      story({ id: `other${i}`, authorId: `o${i}`, viewCount: 50, rating: 3, ratingCount: 4 }),
    );
    const picked = selectRecommended([...dominant, ...others], 6, NOON);
    expect(picked).toHaveLength(6);
    expect(picked.filter((s) => s.authorId === 'same')).toHaveLength(2);
    expect(new Set(picked.map((s) => s.id)).size).toBe(6);
  });

  it('truyện admin đánh dấu lọt kệ thường hơn bản sao không đánh dấu', () => {
    const flagged = story({ id: 'flagged', authorId: 'fa', isRecommended: true, viewCount: 150 });
    const twin = story({ id: 'twin', authorId: 'ta', isRecommended: false, viewCount: 150 });
    const filler = Array.from({ length: 18 }, (_, i) =>
      story({ id: `m${i}`, authorId: `ma${i}`, viewCount: 140, rating: 4, ratingCount: 10 }),
    );
    let flaggedHours = 0;
    let twinHours = 0;
    for (let h = 0; h < 48; h++) {
      const ids = selectRecommended([flagged, twin, ...filler], 8, NOON + h * 3_600_000).map((s) => s.id);
      if (ids.includes('flagged')) flaggedHours++;
      if (ids.includes('twin')) twinHours++;
    }
    expect(flaggedHours).toBeGreaterThan(twinHours);
  });

  it('trả mảng rỗng khi không có truyện hoặc limit không hợp lệ', () => {
    expect(selectRecommended([], 10, NOON)).toEqual([]);
    expect(selectRecommended(shelf, 0, NOON)).toEqual([]);
  });

  it('giữ nguyên object truyện (field thừa vẫn còn)', () => {
    const rich = { ...story({ id: 'rich', authorId: 'r' }), slug: 'rich-slug' };
    const [first] = selectRecommended([rich], 5, NOON);
    expect(first.slug).toBe('rich-slug');
  });
});
