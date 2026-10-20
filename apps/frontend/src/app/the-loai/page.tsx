import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/json-ld';
import { absoluteUrl } from '@/lib/seo/site-url';
import { Breadcrumbs, DiscoveryShell } from '@/components/discovery/discovery-shell';
import { getCategoriesWithCountsServer } from '@/lib/api/server-discovery';

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: 'Thể loại truyện — YÊU' },
  description:
    'Tất cả thể loại truyện trên YÊU: ngôn tình, tiên hiệp, kiếm hiệp, đô thị, trinh thám… Chọn thể loại để xem truyện mới cập nhật, xem nhiều và đánh giá cao.',
  alternates: { canonical: absoluteUrl('/the-loai') },
};

export default async function GenresIndexPage() {
  const { categories, hasCounts } = await getCategoriesWithCountsServer();
  // Có số đếm thì đưa thể loại nhiều truyện lên trước, ẩn thể loại rỗng (trang
  // trống là "nội dung giá trị thấp" với Google/AdSense).
  const visible = hasCounts
    ? categories.filter((c) => c.storyCount > 0).sort((a, b) => b.storyCount - a.storyCount)
    : categories;

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name: 'Thể loại', item: absoluteUrl('/the-loai') },
    ],
  };

  return (
    <DiscoveryShell>
      <JsonLd data={breadcrumb} />
      <Breadcrumbs items={[{ name: 'Trang chủ', href: '/' }, { name: 'Thể loại' }]} />

      <header className="mb-5">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-on-surface">Thể loại truyện</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {visible.length > 0 ? `${visible.length} thể loại` : 'Khám phá truyện theo thể loại'}
        </p>
      </header>

      {visible.length > 0 ? (
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
          {visible.map((c) => (
            <li key={c.id}>
              <Link
                href={`/the-loai/${c.slug}`}
                className="group flex h-full flex-col justify-between gap-1 rounded-2xl border border-outline-variant bg-surface-container px-4 py-3 transition-colors hover:bg-surface-container-high"
              >
                <span className="text-sm font-semibold text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
                  {c.name}
                </span>
                {hasCounts && (
                  <span className="text-xs text-on-surface-variant">{c.storyCount.toLocaleString('vi-VN')} truyện</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container px-6 py-12 text-center">
          <p className="text-base font-semibold text-on-surface">Chưa tải được danh sách thể loại</p>
          <p className="mt-1 text-sm text-on-surface-variant">Vui lòng thử lại sau ít phút.</p>
          <Link
            href="/truyen"
            className="mt-4 inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary"
          >
            Xem kho truyện
          </Link>
        </div>
      )}
    </DiscoveryShell>
  );
}
