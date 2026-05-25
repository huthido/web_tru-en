'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Clock,
    Bookmark,
    Heart,
    Store,
    LayoutDashboard,
    Wallet,
    Settings,
    HelpCircle,
    type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/api/hooks/use-auth';

interface MenuItem {
    href: string;
    label: string;
    icon: LucideIcon;
    fillWhenActive?: boolean;
    authOnly?: boolean;
}

/**
 * Mobile-only grid menu chứa các mục đã từng nằm trong drawer "Khác" của
 * bottom nav. Đặt trong ProfileScreen để user truy cập một chỗ duy nhất.
 * Desktop ẩn (`md:hidden`) vì sidebar đã có đầy đủ link.
 */
export function MobileExtraMenu() {
    const { user } = useAuth();
    const pathname = usePathname();
    const isAuth = !!user;

    const items: MenuItem[] = [
        { href: '/history', label: 'Lịch sử', icon: Clock },
        { href: '/follows', label: 'Theo dõi', icon: Bookmark, fillWhenActive: true },
        { href: '/favorites', label: 'Yêu thích', icon: Heart, fillWhenActive: true },
        { href: '/shop', label: 'Cửa hàng', icon: Store },
        { href: '/author/dashboard', label: 'Kênh tác giả', icon: LayoutDashboard, authOnly: true },
        { href: '/author/earnings', label: 'Kiếm tiền', icon: Wallet, authOnly: true },
        { href: '/profile', label: 'Cài đặt', icon: Settings },
        { href: '/gioi-thieu', label: 'Trợ giúp', icon: HelpCircle },
    ];

    const visible = items.filter((i) => !i.authOnly || isAuth);

    return (
        <section className="md:hidden mt-6">
            <h2 className="text-xs font-bold tracking-wider text-on-surface-variant uppercase mb-3 px-1">
                Các hạng mục
            </h2>
            <div className="grid grid-cols-4 gap-2 bg-surface-container rounded-2xl p-3 border border-outline-variant">
                {visible.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-label={item.label}
                            className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all duration-200 active:scale-95 ${
                                active
                                    ? 'bg-primary/15 text-primary'
                                    : 'bg-transparent text-on-surface-variant hover:bg-surface-variant'
                            }`}
                        >
                            <Icon
                                size={24}
                                fill={active && item.fillWhenActive ? 'currentColor' : 'none'}
                            />
                            <span className="text-[11px] font-medium text-center leading-tight">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
