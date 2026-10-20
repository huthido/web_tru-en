import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';

/** Khung chờ trang đọc chương — giữ bố cục để khỏi nhảy trang khi chuyển chương. */
export default function ChapterLoading() {
  const widths = ['100%', '96%', '100%', '88%', '100%', '93%', '70%'];
  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <div className="md:ml-60 pb-16 md:pb-0">
        <Header />
        <main className="px-4 md:px-6 pt-4 md:pt-8 pb-12 animate-pulse" aria-busy="true" aria-label="Đang tải chương">
          <div className="max-w-4xl mx-auto">
            <div className="h-4 w-40 rounded bg-surface-variant mb-5 md:mx-auto" />
            <div className="h-9 w-3/4 rounded-lg bg-surface-variant mb-4 md:mx-auto" />
            <div className="h-4 w-56 rounded bg-surface-variant mb-8 md:mx-auto" />
            <div className="rounded-lg bg-surface-container p-6 md:p-8 lg:p-12 space-y-6">
              {[0, 1, 2].map((block) => (
                <div key={block} className="space-y-2.5">
                  {widths.map((w, i) => (
                    <div key={i} className="h-4 rounded bg-surface-variant" style={{ width: w }} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
