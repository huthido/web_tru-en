import Link from 'next/link';

export type FilterTab = { key: string; label: string; href: string; hint?: string };

/**
 * Dải tab dạng liên kết (không cần JS): mỗi tab là một URL riêng nên crawler
 * đọc được, nút Back hoạt động, và trang vẫn render hoàn toàn trên server.
 *
 * `variant="segmented"` chia đều chiều ngang (hợp 3–4 lựa chọn trên màn 390px);
 * `variant="chips"` cuộn ngang khi không đủ chỗ.
 */
export function FilterTabs({
  tabs,
  active,
  label,
  variant = 'chips',
}: {
  tabs: FilterTab[];
  active: string;
  label: string;
  variant?: 'segmented' | 'chips';
}) {
  if (variant === 'segmented') {
    return (
      <nav aria-label={label} className="p-1 rounded-full bg-surface-container border border-outline-variant">
        <ul className="grid gap-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((tab) => {
            const isActive = tab.key === active;
            return (
              <li key={tab.key}>
                <Link
                  href={tab.href}
                  scroll={false}
                  aria-current={isActive ? 'page' : undefined}
                  className={`block text-center rounded-full px-2 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label={label} className="-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto scrollbar-hide">
      <ul className="flex gap-2 w-max">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                scroll={false}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex items-center whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container border-transparent'
                    : 'bg-surface-container text-on-surface-variant border-outline-variant hover:text-on-surface'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
