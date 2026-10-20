import Link from 'next/link';

/**
 * Phân trang bằng liên kết thật (?page=N) — crawler đi được hết các trang,
 * không phụ thuộc JS. Rút gọn còn: Trước · 1 … (p-1) p (p+1) … N · Sau.
 */
export function PaginationLinks({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages: Array<number | 'gap'> = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== 'gap') {
      pages.push('gap');
    }
  }

  const base =
    'min-w-[40px] h-10 px-3 inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors';
  const idle = 'bg-surface-container text-on-surface-variant border border-outline-variant hover:text-on-surface';
  const disabled = 'bg-surface-container text-on-surface-variant/40 border border-outline-variant pointer-events-none';

  return (
    <nav aria-label="Phân trang" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className={`${base} ${idle}`}>
          Trước
        </Link>
      ) : (
        <span className={`${base} ${disabled}`} aria-disabled="true">
          Trước
        </span>
      )}
      {pages.map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-on-surface-variant" aria-hidden="true">
            …
          </span>
        ) : p === page ? (
          <span key={p} aria-current="page" className={`${base} bg-primary text-on-primary`}>
            {p}
          </span>
        ) : (
          <Link key={p} href={hrefFor(p)} className={`${base} ${idle}`}>
            {p}
          </Link>
        )
      )}
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} rel="next" className={`${base} ${idle}`}>
          Sau
        </Link>
      ) : (
        <span className={`${base} ${disabled}`} aria-disabled="true">
          Sau
        </span>
      )}
    </nav>
  );
}
