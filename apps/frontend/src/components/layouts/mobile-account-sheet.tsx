'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Clock,
    Bookmark,
    Heart,
    Store,
    LayoutDashboard,
    Wallet,
    Settings,
    HelpCircle,
    Bug,
    Upload,
    Camera,
    Palette,
    Users,
    Package,
    Coins,
    Megaphone,
    LogOut,
    Shield,
    ChevronRight,
    type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useWalletBalance } from '@/lib/api/hooks/use-wallet';
import { BottomSheet } from '@/components/ui/bottom-sheet';

interface MenuItem {
    href: string;
    label: string;
    icon: LucideIcon;
    authOnly?: boolean;
}

/** Nhãn vai trò hiển thị dưới tên người dùng. */
function roleLabel(role?: string): string {
    if (role === 'ADMIN') return 'Quản trị viên';
    if (role === 'AUTHOR') return 'Tác giả';
    return 'Thành viên';
}

interface Props {
    open: boolean;
    onClose: () => void;
}

/**
 * Sheet "Menu" của bottom nav mobile — gom toàn bộ mục mà sidebar desktop có
 * (Kênh tác giả, Kiếm tiền, Cửa hàng, Cài đặt, Đăng xuất…) vào một chỗ dễ
 * thấy. Trước đây các mục này chỉ tới được qua "Chỉnh sửa hồ sơ" → /tai-khoan
 * nên người dùng mới không tìm ra.
 */
export function MobileAccountSheet({ open, onClose }: Props) {
    const router = useRouter();
    const { user, isAuthenticated, logout, isLoggingOut } = useAuth();
    const { data: wallet } = useWalletBalance(open && isAuthenticated);
    const coinBalance = (wallet?.purchasedBalance ?? 0) + (wallet?.earnedBalance ?? 0);

    const profileHref = user ? `/u/${user.profileSlug || user.username}` : '/dang-nhap';

    const authorItems: MenuItem[] = [
        { href: '/tac-gia/bang-dieu-khien', label: 'Kênh tác giả', icon: LayoutDashboard, authOnly: true },
        { href: '/tac-gia/truyen/tao', label: 'Đăng truyện', icon: Upload, authOnly: true },
        { href: '/tac-gia/thu-nhap', label: 'Kiếm tiền', icon: Wallet, authOnly: true },
        { href: '/tac-gia/nguoi-theo-doi', label: 'Người theo dõi', icon: Users, authOnly: true },
    ];

    const generalItems: MenuItem[] = [
        { href: '/nghe-thuat', label: 'Mày tao', icon: Camera },
        { href: '/tranh', label: 'Tranh', icon: Palette },
        { href: '/cua-hang', label: 'Cửa hàng', icon: Store },
        { href: '/vat-pham-cua-toi', label: 'Kho vật phẩm', icon: Package, authOnly: true },
        { href: '/lich-su', label: 'Lịch sử', icon: Clock },
        { href: '/dang-theo-doi', label: 'Theo dõi', icon: Bookmark },
        { href: '/yeu-thich', label: 'Yêu thích', icon: Heart },
        { href: '/quang-cao', label: 'Quảng cáo', icon: Megaphone },
    ];

    const bottomItems: MenuItem[] = [
        { href: '/tai-khoan', label: 'Cài đặt tài khoản', icon: Settings, authOnly: true },
        { href: '/gioi-thieu', label: 'Trợ giúp', icon: HelpCircle },
        { href: '/bao-loi', label: 'Báo lỗi', icon: Bug, authOnly: true },
    ];

    const visible = (items: MenuItem[]) => items.filter((i) => !i.authOnly || isAuthenticated);

    const handleLogout = async () => {
        try {
            await logout();
            onClose();
            router.push('/');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const Grid = ({ items }: { items: MenuItem[] }) => (
        <div className="grid grid-cols-4 gap-2">
            {items.map((item) => {
                const Icon = item.icon;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-surface-container-high/60 text-on-surface hover:bg-surface-container-high active:scale-95 transition-all"
                    >
                        <Icon size={22} className="text-primary" />
                        <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                    </Link>
                );
            })}
        </div>
    );

    return (
        <BottomSheet open={open} onClose={onClose} title="Menu">
            {isAuthenticated && user ? (
                <Link
                    href={profileHref}
                    onClick={onClose}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-high/60 hover:bg-surface-container-high transition-colors mb-4"
                >
                    <span className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center overflow-hidden flex-shrink-0">
                        {user.avatar ? (
                            <img src={user.avatar} alt={user.displayName || user.username} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-base font-bold text-on-primary-container">
                                {(user.displayName || user.username || '?').charAt(0).toUpperCase()}
                            </span>
                        )}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-on-surface truncate">
                            {user.displayName || user.username}
                        </span>
                        <span className="block text-[11px] uppercase tracking-wider text-on-surface-variant">
                            {roleLabel(user.role)} · Xem trang cá nhân
                        </span>
                    </span>
                    <ChevronRight size={18} className="text-on-surface-variant flex-shrink-0" />
                </Link>
            ) : (
                <div className="flex flex-col gap-2 p-4 rounded-2xl bg-surface-container-high/60 mb-4">
                    <p className="text-sm text-on-surface">Đăng nhập để đăng truyện, theo dõi tác giả và kiếm xu.</p>
                    <div className="flex gap-2">
                        <Link href="/dang-nhap" onClick={onClose} className="flex-1 text-center px-4 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold">
                            Đăng nhập
                        </Link>
                        <Link href="/dang-ky" onClick={onClose} className="flex-1 text-center px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface text-sm font-semibold">
                            Đăng ký
                        </Link>
                    </div>
                </div>
            )}

            {isAuthenticated && (
                <Link
                    href="/cua-hang"
                    onClick={onClose}
                    className="flex items-center justify-between px-4 py-3 rounded-xl border border-outline-variant/60 mb-4 hover:bg-surface-container-high transition-colors"
                >
                    <span className="flex items-center gap-2 text-sm font-medium text-on-surface">
                        <Coins size={18} className="text-amber-500" />
                        Số dư: <b>{coinBalance.toLocaleString('vi-VN')}</b> xu
                    </span>
                    <span className="text-xs font-semibold text-primary">Nạp xu</span>
                </Link>
            )}

            {isAuthenticated && (
                <section className="mb-4">
                    <h3 className="text-[11px] font-bold tracking-wider text-on-surface-variant uppercase mb-2 px-1">
                        Sáng tác
                    </h3>
                    <Grid items={visible(authorItems)} />
                </section>
            )}

            <section className="mb-4">
                <h3 className="text-[11px] font-bold tracking-wider text-on-surface-variant uppercase mb-2 px-1">
                    Khám phá
                </h3>
                <Grid items={visible(generalItems)} />
            </section>

            <section className="border-t border-outline-variant/40 pt-3">
                {visible(bottomItems).map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onClose}
                            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-on-surface hover:bg-surface-container-high transition-colors"
                        >
                            <Icon size={20} className="text-on-surface-variant" />
                            <span className="flex-1">{item.label}</span>
                            <ChevronRight size={16} className="text-on-surface-variant" />
                        </Link>
                    );
                })}
                {user?.role === 'ADMIN' && (
                    <Link
                        href="/quan-tri"
                        onClick={onClose}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-tertiary hover:bg-surface-container-high transition-colors"
                    >
                        <Shield size={20} />
                        <span className="flex-1">Trang quản trị</span>
                        <ChevronRight size={16} className="text-on-surface-variant" />
                    </Link>
                )}
                {isAuthenticated && (
                    <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-red-600 dark:text-red-400 hover:bg-surface-container-high transition-colors disabled:opacity-50"
                    >
                        <LogOut size={20} />
                        <span className="flex-1 text-left">{isLoggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}</span>
                    </button>
                )}
            </section>
        </BottomSheet>
    );
}
