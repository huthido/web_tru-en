'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Loading } from '@/components/ui/loading';
import { BookCard } from '@/components/books/book-card';
import { DonateAuthorModal } from '@/components/stories/donate-author-modal';
import { FollowAuthorButton } from '@/components/users/follow-author-button';
import { VerifiedBadge } from '@/components/users/verified-badge';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { useAuthorProfile, useAuthorStories } from '@/lib/api/hooks/use-authors';
import { HeartHandshake, Eye, Users, BookOpen, UserCircle2 } from 'lucide-react';

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
  const { data: storiesPage, isLoading: storiesLoading } = useAuthorStories(profile?.id);
  const [donateOpen, setDonateOpen] = useState(false);

  const isMe = !!me && !!profile && me.id === profile.id;

  return (
    <div className="min-h-screen bg-surface transition-colors duration-300">
      <Sidebar />
      <div className="md:ml-60 pb-16 md:pb-0">
        <Header />
        <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)] px-4 md:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
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
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          <b className="text-on-surface">{profile.authorFollowerCount.toLocaleString('vi-VN')}</b> followers
                        </span>
                      </div>
                    </div>

                    {/* CTA cluster */}
                    {!isMe && (
                      <div className="flex gap-2 md:flex-col md:items-stretch md:w-44 flex-shrink-0">
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
                      </div>
                    )}
                  </div>
                </section>

                {/* Tab Tác phẩm */}
                <section>
                  <h2 className="font-display text-lg md:text-xl font-bold text-on-surface mb-4">
                    Tác phẩm đã đăng
                  </h2>
                  {storiesLoading ? (
                    <div className="py-10"><Loading /></div>
                  ) : !storiesPage?.data.length ? (
                    <div className="text-center py-10 text-on-surface-variant">
                      Tác giả chưa đăng truyện nào.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
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
