'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { Loading } from '@/components/ui/loading';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { useAuthorFollowers } from '@/lib/api/hooks/use-authors';
import type { AuthorFollowerItem } from '@/lib/api/authors.service';
import { Users, UserCircle2, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function FollowerRow({ f }: { f: AuthorFollowerItem }) {
  const name = f.displayName || f.username;
  return (
    <Link
      href={`/u/${encodeURIComponent(f.username)}`}
      className="flex items-center gap-3 p-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant transition-colors"
    >
      <span className="w-11 h-11 rounded-full overflow-hidden bg-surface-variant flex items-center justify-center flex-shrink-0">
        {f.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.avatar} alt={name} className="w-full h-full object-cover" />
        ) : (
          <UserCircle2 className="w-7 h-7 text-on-surface-variant" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-on-surface truncate">{name}</span>
        <span className="block text-xs text-on-surface-variant truncate">@{f.username}</span>
      </span>
      <span className="text-xs text-on-surface-variant flex-shrink-0">
        Theo dõi {formatDate(f.followedAt)}
      </span>
    </Link>
  );
}

function FollowersContent() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const limit = 20;
  const { data, isLoading, error } = useAuthorFollowers(user?.id, page, limit);

  const followers = data?.data || [];
  const total = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 1;

  return (
    <div className="min-h-screen bg-surface transition-colors duration-300">
      <Sidebar />
      <div className="md:ml-60 pb-16 md:pb-0">
        <Header />
        <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            {/* Back link */}
            {user?.username && (
              <Link
                href={`/u/${encodeURIComponent(user.username)}`}
                className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Về trang cá nhân
              </Link>
            )}

            {/* Page header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-on-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-on-surface">Người theo dõi</h1>
                <p className="text-sm text-on-surface-variant">
                  {isLoading ? 'Đang tải...' : `${total.toLocaleString('vi-VN')} người đang theo dõi bạn`}
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="py-16"><Loading /></div>
            ) : error ? (
              <div className="text-center py-16 text-on-surface-variant">
                Không thể tải danh sách người theo dõi. Vui lòng thử lại sau.
              </div>
            ) : followers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 md:py-24 text-center">
                <div className="w-20 h-20 mb-5 rounded-full bg-surface-variant flex items-center justify-center">
                  <Users className="w-10 h-10 text-on-surface-variant" />
                </div>
                <h2 className="text-lg md:text-xl font-semibold text-on-surface mb-2">
                  Chưa có người theo dõi
                </h2>
                <p className="text-sm text-on-surface-variant max-w-md">
                  Hãy chia sẻ trang cá nhân của bạn ra các nền tảng khác để thu hút thêm người theo dõi nhé!
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2.5">
                  {followers.map((f) => (
                    <FollowerRow key={f.id} f={f} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface-variant disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
                      aria-label="Trang trước"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="px-4 py-2 text-sm text-on-surface-variant">
                      Trang <b className="text-on-surface">{page}</b> / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="p-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface-variant disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
                      aria-label="Trang sau"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function AuthorFollowersPage() {
  return (
    <ProtectedRoute>
      <FollowersContent />
    </ProtectedRoute>
  );
}
