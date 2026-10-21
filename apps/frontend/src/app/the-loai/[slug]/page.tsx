import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl } from '@/lib/seo/site-url';
import { BookCard, storyHasAudio } from '@/components/books/book-card';
import { Breadcrumbs, DiscoveryShell } from '@/components/discovery/discovery-shell';
import { FilterTabs } from '@/components/discovery/filter-tabs';
import { PaginationLinks } from '@/components/discovery/pagination-links';
import {
  GENRE_SORTS,
  getCategoriesWithCountsServer,
  getGenreStoriesServer,
  type CategoryWithCount,
  type GenreSort,
} from '@/lib/api/server-discovery';

export const revalidate = 300;

const DEFAULT_SORT: GenreSort = 'updated';

type Props = {
  params: { slug: string };
  searchParams: { sort?: string; page?: string };
};

function parseQuery(searchParams: Props['searchParams']) {
  const sort = (Object.keys(GENRE_SORTS) as GenreSort[]).find((k) => k === searchParams.sort) || DEFAULT_SORT;
  const page = Math.max(1, Number.parseInt(searchParams.page || '1', 10) || 1);
  return { sort, page };
}

function genreHref(slug: string, sort: GenreSort, page: number): string {
  const params = new URLSearchParams();
  if (sort !== DEFAULT_SORT) params.set('sort', sort);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `/the-loai/${slug}?${qs}` : `/the-loai/${slug}`;
}

/**
 * Tìm thể loại theo slug. Trả về:
 *  - category: tìm thấy;
 *  - null: danh sách tải được nhưng không có slug này → 404;
 *  - fallback (từ slug) khi backend lỗi, để trang không 404 oan lúc sự cố.
 */
async function resolveCategory(slug: string): Promise<{ category: CategoryWithCount | null; hasCounts: boolean }> {
  const { categories, hasCounts } = await getCategoriesWithCountsServer();
  if (categories.length === 0) {
    let name = slug;
    try {
      name = decodeURIComponent(slug);
    } catch {
      // slug hỏng mã hoá — dùng nguyên văn
    }
    name = name.replace(/-/g, ' ');
    return {
      category: { id: slug, slug, name: name.charAt(0).toUpperCase() + name.slice(1), storyCount: 0 },
      hasCounts: false,
    };
  }
  return { category: categories.find((c) => c.slug === slug) || null, hasCounts };
}

function describe(category: CategoryWithCount, hasCounts: boolean): string {
  if (category.description && category.description.trim()) {
    const text = category.description.trim();
    return text.length > 160 ? `${text.slice(0, 157).trimEnd()}...` : text;
  }
  const count = hasCounts && category.storyCount > 0 ? `${category.storyCount.toLocaleString('vi-VN')} truyện ` : 'Truyện ';
  return `${count}${category.name} hay trên YÊU — đọc miễn phí, sắp xếp theo mới cập nhật, xem nhiều và đánh giá cao.`;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { category, hasCounts } = await resolveCategory(params.slug);
  if (!category) return { title: 'Không tìm thấy thể loại', robots: { index: false, follow: true } };

  const { sort, page } = parseQuery(searchParams);
  const title = `Truyện ${category.name} — YÊU${page > 1 ? ` (Trang ${page})` : ''}`;
  const description = describe(category, hasCounts);
  // Thứ tự khác chỉ là cách xếp khác của cùng một tập truyện → không đánh chỉ
  // mục, canonical về bản mặc định. Thể loại rỗng cũng không đánh chỉ mục.
  const indexable = sort === DEFAULT_SORT && !(hasCounts && category.storyCount === 0);
  const canonical = absoluteUrl(genreHref(category.slug, DEFAULT_SORT, sort === DEFAULT_SORT ? page : 1));

  return {
    title: { absolute: title },
    description,
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
    alternates: { canonical },
    openGraph: {
      type: 'website',
      title,
      description,
      url: canonical,
      siteName: 'YÊU',
      locale: 'vi_VN',
    },
  };
}

export default async function GenrePage({ params, searchParams }: Props) {
  const { category, hasCounts } = await resolveCategory(params.slug);
  if (!category) notFound();

  const { sort, page } = parseQuery(searchParams);
  const { data: stories, meta } = await getGenreStoriesServer(category.slug, sort, page);
  const totalPages = meta?.totalPages || 0;
  const total = meta?.total ?? (hasCounts ? category.storyCount : 0);

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Thể loại', item: absoluteUrl('/the-loai') },
      { '@type': 'ListItem', position: 3, name: category.name, item: absoluteUrl(`/the-loai/${category.slug}`) },
    ],
  };

  return (
    <DiscoveryShell>
      <JsonLd data={breadcrumb} />
      <Breadcrumbs
        items={[{ name: 'Trang chủ', href: '/' }, { name: 'Thể loại', href: '/the-loai' }, { name: category.name }]}
      />

      <header className="mb-5">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-on-surface">Truyện {category.name}</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {total > 0 ? `${total.toLocaleString('vi-VN')} truyện` : 'Khám phá truyện theo thể loại'}
          {page > 1 && totalPages > 0 ? ` · Trang ${page}/${totalPages}` : ''}
        </p>
        {category.description && (
          <p className="mt-2 text-sm text-on-surface-variant line-clamp-3">{category.description}</p>
        )}
      </header>

      <div className="mb-5">
        <FilterTabs
          label="Sắp xếp"
          active={sort}
          tabs={(Object.keys(GENRE_SORTS) as GenreSort[]).map((key) => ({
            key,
            label: GENRE_SORTS[key],
            href: genreHref(category.slug, key, 1),
          }))}
        />
      </div>

      {stories.length > 0 ? (
        <>
          <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {stories.map((story) => (
              <li key={story.id}>
                <BookCard
                  id={story.id}
                  title={story.title}
                  author={story.authorName || story.author?.displayName || story.author?.username}
                  viewCount={story.viewCount || 0}
                  rating={story.rating}
                  ratingCount={story.ratingCount}
                  coverImage={story.coverImage}
                  slug={story.slug}
                  storyId={story.id}
                  hasAudio={storyHasAudio(story)}
                />
              </li>
            ))}
          </ul>
          <PaginationLinks
            page={page}
            totalPages={totalPages}
            hrefFor={(p) => genreHref(category.slug, sort, p)}
          />
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container px-6 py-12 text-center">
          <p className="text-base font-semibold text-on-surface">
            {page > 1 ? 'Không còn truyện ở trang này' : 'Thể loại này chưa có truyện'}
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">Thử thể loại khác hoặc xem toàn bộ kho truyện.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              href="/the-loai"
              className="inline-flex items-center rounded-full border border-outline-variant bg-surface px-5 py-2 text-sm font-semibold text-on-surface"
            >
              Tất cả thể loại
            </Link>
            <Link
              href="/truyen"
              className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary"
            >
              Kho truyện
            </Link>
          </div>
        </div>
      )}
    </DiscoveryShell>
  );
}
