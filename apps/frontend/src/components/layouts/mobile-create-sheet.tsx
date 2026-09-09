'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BookPlus, FilePlus2, LayoutDashboard, Camera, ChevronRight, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { storiesService, type Story } from '@/lib/api/stories.service';
import { BottomSheet } from '@/components/ui/bottom-sheet';

interface Props {
    open: boolean;
    onClose: () => void;
}

interface Action {
    href: string;
    label: string;
    hint?: string;
    icon: LucideIcon;
    primary?: boolean;
}

/**
 * Sheet của nút "+" ở bottom nav mobile. Thay vì nhảy thẳng vào form tạo
 * truyện (người mới không hiểu nút "+" làm gì), liệt kê rõ các thao tác
 * sáng tác: đăng truyện, thêm chương vào truyện gần nhất, quản lý truyện,
 * đăng ảnh. Khách chưa đăng nhập được dẫn tới trang đăng nhập.
 */
export function MobileCreateSheet({ open, onClose }: Props) {
    const { user, isAuthenticated } = useAuth();

    // Truyện mới tạo gần nhất (API sắp xếp createdAt desc) — chỉ fetch khi sheet mở.
    const { data: latest } = useQuery({
        queryKey: ['stories', 'me', 'latest-for-create-sheet'],
        queryFn: async () => {
            const res: any = await storiesService.getMyStories({ limit: 1, page: 1 });
            const list: Story[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
            return list[0] ?? null;
        },
        enabled: open && isAuthenticated,
        staleTime: 30_000,
    });

    const loginRedirect = (path: string) => `/dang-nhap?redirect=${encodeURIComponent(path)}`;
    const withAuth = (path: string) => (isAuthenticated ? path : loginRedirect(path));

    const actions: Action[] = [
        {
            href: withAuth('/tac-gia/truyen/tao'),
            label: 'Đăng truyện mới',
            hint: 'Tạo truyện: bìa, mô tả, thể loại rồi thêm chương',
            icon: BookPlus,
            primary: true,
        },
    ];
    if (latest) {
        actions.push({
            href: `/tac-gia/truyen/${latest.slug}/chuong/tao`,
            label: 'Thêm chương mới',
            hint: `Vào truyện "${latest.title}"`,
            icon: FilePlus2,
        });
    }
    actions.push(
        {
            href: withAuth('/tac-gia/bang-dieu-khien'),
            label: 'Quản lý truyện của tôi',
            hint: 'Sửa truyện, chương, gửi duyệt, thống kê',
            icon: LayoutDashboard,
        },
        {
            href: withAuth('/nghe-thuat'),
            label: 'Đăng ảnh Mày tao',
            hint: 'Chia sẻ ảnh, tranh nghệ thuật',
            icon: Camera,
        },
    );

    return (
        <BottomSheet open={open} onClose={onClose} title="Sáng tác">
            {!isAuthenticated && (
                <p className="text-sm text-on-surface-variant mb-3 px-1">
                    Bạn cần đăng nhập để đăng truyện. Chọn một mục bên dưới để đăng nhập rồi tiếp tục.
                </p>
            )}
            <div className="flex flex-col gap-2">
                {actions.map((a) => {
                    const Icon = a.icon;
                    return (
                        <Link
                            key={a.label}
                            href={a.href}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98] ${
                                a.primary
                                    ? 'bg-primary text-on-primary shadow-sm shadow-primary/20'
                                    : 'bg-surface-container-high/60 text-on-surface hover:bg-surface-container-high'
                            }`}
                        >
                            <span
                                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                    a.primary ? 'bg-on-primary/15' : 'bg-primary/10 text-primary'
                                }`}
                            >
                                <Icon size={20} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold">{a.label}</span>
                                {a.hint && (
                                    <span className={`block text-xs truncate ${a.primary ? 'opacity-85' : 'text-on-surface-variant'}`}>
                                        {a.hint}
                                    </span>
                                )}
                            </span>
                            <ChevronRight size={18} className="flex-shrink-0 opacity-70" />
                        </Link>
                    );
                })}
            </div>
            {isAuthenticated && user && (
                <p className="text-xs text-on-surface-variant mt-4 px-1">
                    Quy trình: tạo truyện → thêm ít nhất 1 chương → bấm "Gửi duyệt" trong Kênh tác giả. Admin duyệt xong truyện sẽ hiển thị công khai.
                </p>
            )}
        </BottomSheet>
    );
}
