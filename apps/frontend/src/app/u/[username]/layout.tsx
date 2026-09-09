'use client';

import { useParams, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { Loading } from '@/components/ui/loading';
import { DonateAuthorModal } from '@/components/stories/donate-author-modal';
import { FollowAuthorButton } from '@/components/users/follow-author-button';
import { ShareProfileMenu } from '@/components/users/share-profile-menu';
import { VerifiedBadge } from '@/components/users/verified-badge';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { useAuthorProfile } from '@/lib/api/hooks/use-authors';
import { HeartHandshake, Eye, Users, BookOpen, UserCircle2, Pencil, Image as ImageIcon, Palette, LayoutDashboard, Upload, Wallet, Settings } from 'lucide-react';

/** Điều hướng giữa 3 trang tác phẩm (mỗi loại là 1 trang riêng, không tab). */
const WORK_NAV = [
  { key: 'truyen', label: 'Truyện', icon: BookOpen },
  { key: 'tranh', label: 'Tranh', icon: Palette },
  { key: 'nghe-thuat', label: 'Nghệ thuật', icon: ImageIcon },
] as const;

/**
 * Layout dùng chung cho trang cá nhân /u/[username] và 3 trang con
 * (/truyen, /tranh, /nghe-thuat). Giữ header (avatar/bio/stats/CTA) + thanh
 * điều hướng cố định khi chuyển giữa các loại tác phẩm — profile chỉ fetch 1
 * lần (react-query cache) nên không nhấp nháy.
 */
export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const username = typeof params?.username === 'string' ? params.username : '';
  const pathname = usePathname();
  const { user: me } = useAuth();
  const { data: profile, isLoading } = useAuthorProfile(username);
  const [donateOpen, setDonateOpen] = useState(false);

  const isMe = !!me && !!profile && me.id === profile.id;

  // URL tuyệt đối của trang cá nhân để chia sẻ — ưu tiên slug tuỳ chỉnh nếu có.
  const shareSlug = profile?.profileSlug || username;
  const [profileUrl, setProfileUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (shareSlug) {
      setProfileUrl(`${window.location.origin}/u/${encodeURIComponent(shareSlug)}`);
    }
  }, [shareSlug]);
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
                            href="/tac-gia/nguoi-theo-doi"
                            className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
                          >
                            <Users className="w-4 h-4" />
                            <b className="text-on-surface">{profile.authorFollowerCount.toLocaleString('vi-VN')}</b> người theo dõi
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <Users className="w-4 h-4" />
                            <b className="text-on-surface">{profile.authorFollowerCount.toLocaleString('vi-VN')}</b> người theo dõi
                          </span>
                        )}
                      </div>
                    </div>

                    {/* CTA cluster */}
                    <div className="flex gap-2 md:flex-col md:items-stretch md:w-44 flex-shrink-0">
                      {isMe ? (
                        <>
                          <Link
                            href="/tai-khoan"
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
                            Ủng hộ xu
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

                {/* Lối tắt tác giả — chỉ chủ tài khoản thấy. Trên mobile đây là nơi
                    người dùng hay vào nhất nên đặt luôn Kênh tác giả/Đăng truyện ở đây. */}
                {isMe && (
                  <section className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-3 md:p-4">
                    <p className="text-sm font-semibold text-on-surface mb-2.5">Quản lý sáng tác của bạn</p>
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                      <Link href="/tac-gia/truyen/tao" className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-on-primary hover:bg-primary/90 transition-colors">
                        <Upload className="w-4 h-4" /> Đăng truyện mới
                      </Link>
                      <Link href="/tac-gia/bang-dieu-khien" className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold bg-surface-container text-on-surface border border-outline-variant hover:bg-surface-container-high transition-colors">
                        <LayoutDashboard className="w-4 h-4" /> Kênh tác giả
                      </Link>
                      <Link href="/tac-gia/thu-nhap" className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold bg-surface-container text-on-surface border border-outline-variant hover:bg-surface-container-high transition-colors">
                        <Wallet className="w-4 h-4" /> Kiếm tiền
                      </Link>
                      <Link href="/tai-khoan" className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold bg-surface-container text-on-surface border border-outline-variant hover:bg-surface-container-high transition-colors">
                        <Settings className="w-4 h-4" /> Cài đặt
                      </Link>
                    </div>
                    <p className="mt-2 text-xs text-on-surface-variant">
                      Muốn sửa một truyện: mở truyện đó, thanh “Bạn là tác giả” sẽ có nút Sửa truyện / Thêm chương.
                    </p>
                  </section>
                )}

                {/* Tác phẩm đã đăng — điều hướng tới 3 trang riêng biệt */}
                <section>
                  <h2 className="font-display text-lg md:text-xl font-bold text-on-surface mb-4">
                    Tác phẩm đã đăng
                  </h2>

                  <nav className="flex flex-wrap gap-2 mb-5 border-b border-outline-variant pb-3">
                    {WORK_NAV.map((t) => {
                      const Icon = t.icon;
                      const href = `/u/${encodeURIComponent(username)}/${t.key}`;
                      const active = pathname === href;
                      return (
                        <Link
                          key={t.key}
                          href={href}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${active
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                            }`}
                        >
                          <Icon className="w-4 h-4" />
                          {t.label}
                        </Link>
                      );
                    })}
                  </nav>

                  {children}
                </section>

                {/* Ủng hộ xu modal */}
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
