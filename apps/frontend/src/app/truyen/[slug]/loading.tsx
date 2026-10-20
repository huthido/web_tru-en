import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';

/** Khung chờ trang chi tiết truyện (hiện ngay khi bấm vào truyện). */
export default function StoryLoading() {
  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <div className="md:ml-60 pb-16 md:pb-0">
        <Header />
        <main className="px-4 md:px-6 pt-6 md:pt-10 pb-12 max-w-6xl mx-auto animate-pulse" aria-busy="true" aria-label="Đang tải truyện">
          <div className="flex flex-col md:flex-row gap-6 md:gap-10">
            <div className="w-40 md:w-60 aspect-[3/4] rounded-xl bg-surface-variant mx-auto md:mx-0 flex-shrink-0" />
            <div className="flex-1 space-y-4">
              <div className="h-8 w-3/4 rounded-lg bg-surface-variant" />
              <div className="h-4 w-1/3 rounded bg-surface-variant" />
              <div className="flex gap-2">
                <div className="h-6 w-16 rounded-full bg-surface-variant" />
                <div className="h-6 w-20 rounded-full bg-surface-variant" />
                <div className="h-6 w-14 rounded-full bg-surface-variant" />
              </div>
              <div className="flex gap-3 pt-2">
                <div className="h-12 w-40 rounded-full bg-surface-variant" />
                <div className="h-12 w-28 rounded-full bg-surface-variant" />
              </div>
              <div className="space-y-2 pt-4">
                <div className="h-4 w-full rounded bg-surface-variant" />
                <div className="h-4 w-full rounded bg-surface-variant" />
                <div className="h-4 w-2/3 rounded bg-surface-variant" />
              </div>
            </div>
          </div>
          <div className="mt-10 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-surface-variant" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
