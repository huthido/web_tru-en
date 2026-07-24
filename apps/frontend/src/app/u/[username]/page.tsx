'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Loading } from '@/components/ui/loading';
import { BookCard } from '@/components/books/book-card';
import { DonateAuthorModal } from '@/components/stories/donate-author-modal';
import { FollowAuthorButton } from '@/components/users/follow-author-button';
import { ShareProfileMenu } from '@/components/users/share-profile-menu';
import { VerifiedBadge } from '@/components/users/verified-badge';
import { ProfilePaintingsGrid } from '@/components/users/profile-paintings-grid';
import { ProfileArtGrid } from '@/components/users/profile-art-grid';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { useAuthorProfile, useAuthorStories } from '@/lib/api/hooks/use-authors';
import { usePageLimit } from '@/hooks/use-page-limit';
import { HeartHandshake, Eye, Users, BookOpen, UserCircle2, ChevronLeft, ChevronRight, Pencil, Image as ImageIcon, Palette } from 'lucide-react';

/** Các loại tác phẩm hiển thị ở trang cá nhân. */
type WorkTab = 'stories' | 'paintings' | 'art';

const WORK_TABS: { key: WorkTab; label: string; icon: typeof BookOpen }[] = [
  { key: 'stories', label: 'Truyện', icon: BookOpen },
  { key: 'paintings', label: 'Tranh', icon: Palette },
  { key: 'art', label: 'Ảnh nghệ thuật', icon: ImageIcon },
];

/**
 * Trang cá nhân kiểu MXH /u/[username]
 *
 * Mỗi user/tác giả có 1 profile public với:
 *   - Avatar + bio + stats (truyện · view · followers)
 *   - 2 CTA: Theo dõi tác giả · Donate xu (chỉ enable khi tác giả monetized)
 *   - Tab Tác phẩm: grid BookCard
 */
export default function PublicUserProfilePage() {
  const params = useParams();
  const username = typeof params?.username === 'string' ? params.username : '';
  const { user: me } = useAuth();
  const { data: profile, isLoading } = useAuthorProfile(username);
  // Phân trang theo màn hình: xl (lưới 6 cột) 24 truyện/trang, nhỏ hơn 20.
  const limit = usePageLimit(20, 24);
  const [page, setPage] = useState(1);
  const { data: storiesPage, isLoading: storiesLoading } = useAuthorStories(profile?.id, page, limit);
  const [donateOpen, setDonateOpen] = useState(false);
  const [tab, setTab] = useState<WorkTab>('stories');

  const totalPages = storiesPage?.meta?.totalPages || 1;

  const isMe = !!me && !!profile && me.id === profile.id;

  // URL tuyệt đối của trang cá nhân để chia sẻ ra nền tảng khác.
  const profileUrl =
    typeof window !== 'undefined' && username
      ? `${window.location.origin}/u/${encodeURIComponent(username)}`
      : undefined;
  const displayName = profile?.displayName || profile?.username || '';

  return (
    <div className="min-h-screen bg-surface transition-colors duration-300">
      <Sidebar />
      <div className="md:ml-60 pb-16 md:pb-0">
        <Header />
        <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {isLoading || !profile ? (
              <div className="py-20"><Loading /></div>
            ) : (
              <>
                {/* Header card cảm hứng Facebook/Threads */}
                <section className="bg-surface-container rounded-2xl p-5 md:p-8 mb-6 shadow-sm border border-outline-variant">
                  <div className="flex flex-col md:flex-row md:items-center gap-5">
                    <div className="flex-shrink-0">
                      <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden bg-surface-variant border-2 border-outline-variant">
                        {profile.avatar ? (
                          <OptimizedImage
                            src={profile.avatar}
                            alt={profile.displayName || profile.username}
                            fill
                            sizes="128px"
                            objectFit="cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                            <UserCircle2 className="w-16 h-16" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className="font-display text-2xl md:text-3xl font-bold text-on-surface truncate inline-flex items-center gap-1.5">
                        <span className="truncate">{profile.displayName || profile.username}</span>
                        <VerifiedBadge show={profile.isVerified} size={22} />
                      </h1>
                      <p className="text-on-surface-variant text-sm">@{profile.username}</p>
                      {profile.bio && (
                        <p className="text-on-surface mt-2 text-sm md:text-base line-clamp-3 whitespace-pre-wrap">
                          {profile.bio}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-sm text-on-surface-variant">
                        <span className="inline-flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4" />
                          <b className="text-on-surface">{profile.publishedStoriesCount.toLocaleString('vi-VN')}</b> truyện
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Eye className="w-4 h-4" />
                          <b className="text-on-surface">{profile.totalViews.toLocaleString('vi-VN')}</b> lượt xem
                        </span>
                        {isMe ? (
                          <Link
                            href="/author/followers"
                            className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
                          >
                            <Users className="w-4 h-4" />
                            <b className="text-on-surface">{profile.authorFollowerCount.toLocaleString('vi-VN')}</b> followers
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <Users className="w-4 h-4" />
                            <b className="text-on-surface">{profile.authorFollowerCount.toLocaleString('vi-VN')}</b> followers
                          </span>
                        )}
                      </div>
                    </div>

                    {/* CTA cluster */}
                    <div className="flex gap-2 md:flex-col md:items-stretch md:w-44 flex-shrink-0">
                      {isMe ? (
                        <>
                          <Link
                            href="/profile"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors flex-1 md:flex-none bg-primary hover:bg-primary/90 text-on-primary"
                          >
                            <Pencil className="w-4 h-4" />
                            Chỉnh sửa hồ sơ
                          </Link>
                          <ShareProfileMenu
                            url={profileUrl}
                            title={displayName}
                            className="flex-1 md:flex-none"
                          />
                        </>
                      ) : (
                        <>
                          <FollowAuthorButton
                            authorId={profile.id}
                            initialFollowing={profile.isFollowing}
                            className="flex-1 md:flex-none"
                          />
                          <button
                            type="button"
                            onClick={() => setDonateOpen(true)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors flex-1 md:flex-none bg-surface-variant hover:bg-surface-container-high text-on-surface"
                          >
                            <HeartHandshake className="w-4 h-4" />
                            Donate xu
                          </button>
                          <ShareProfileMenu
                            url={profileUrl}
                            title={displayName}
                            className="flex-1 md:flex-none"
                          />
                        </>
                      )}
                    </div>
                  </div>
                </section>

                {/* Tác phẩm đã đăng — tách theo loại nội dung (truyện / tranh / ảnh) */}
                <section>
                  <h2 className="font-display text-lg md:text-xl font-bold text-on-surface mb-4">
                    Tác phẩm đã đăng
                  </h2>

                  {/* Tabs loại tác phẩm */}
                  <div className="flex flex-wrap gap-2 mb-5 border-b border-outline-variant pb-3">
                    {WORK_TABS.map((t) => {
                      const Icon = t.icon;
                      const active = tab === t.key;
                      return (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => setTab(t.key)}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${active
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                            }`}
                        >
                          <Icon className="w-4 h-4" />
                          {t.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Truyện */}
                  {tab === 'stories' && (
                    storiesLoading ? (
                      <div className="py-10"><Loading /></div>
                    ) : !storiesPage?.data.length ? (
                      <div className="py-16 flex flex-col items-center gap-2 text-on-surface-variant">
                        <span className="text-5xl">📖</span>
                        <p className="text-base font-medium">
                          {isMe ? 'Bạn chưa đăng truyện nào.' : 'Tác giả chưa đăng truyện nào.'}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                          {storiesPage.data.map((s) => (
                            <BookCard
                              key={s.id}
                              id={s.id}
                              slug={s.slug}
                              title={s.title}
                              viewCount={s.viewCount}
                              rating={s.rating}
                              ratingCount={s.ratingCount}
                              coverImage={s.coverImage}
                            />
                          ))}
                        </div>

                        {/* Phân trang */}
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
                    )
                  )}

                  {/* Tranh — gian hàng tranh của tác giả */}
                  {tab === 'paintings' && (
                    <ProfilePaintingsGrid
                      authorId={profile.id}
                      currentUserId={me?.id}
                      isMe={isMe}
                    />
                  )}

                  {/* Ảnh nghệ thuật — bài đăng ở Cộng đồng nghệ thuật */}
                  {tab === 'art' && (
                    <ProfileArtGrid
                      userId={profile.id}
                      currentUserId={me?.id}
                      isMe={isMe}
                    />
                  )}
                </section>

                {/* Donate modal */}
                {donateOpen && (
                  <DonateAuthorModal
                    isOpen={donateOpen}
                    onClose={() => setDonateOpen(false)}
                    authorId={profile.id}
                    authorName={profile.displayName || profile.username}
                  />
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
