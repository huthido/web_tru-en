'use client';

import Link from 'next/link';
import { FilePlus2, ListOrdered, Pencil, BarChart3, PenLine } from 'lucide-react';

interface Props {
    storyId: string;
    storySlug: string;
    isPublished?: boolean;
    chapterCount?: number;
    className?: string;
}

/**
 * Thanh công cụ hiện trên trang chi tiết truyện khi người xem là tác giả (hoặc
 * admin). Trước đây muốn sửa truyện/thêm chương phải tự biết đường vào Kênh
 * tác giả — trên mobile gần như không ai tìm ra. Đặt ngay dưới nút "Trở lại".
 */
export function StoryOwnerBar({ storyId, storySlug, isPublished, chapterCount, className = '' }: Props) {
    const noChapters = typeof chapterCount === 'number' && chapterCount === 0;
    const actions = [
        {
            href: `/tac-gia/truyen/${storySlug}/chuong/tao`,
            label: noChapters ? 'Thêm chương đầu tiên' : 'Thêm chương',
            icon: FilePlus2,
            primary: true,
        },
        { href: `/tac-gia/truyen/${storySlug}/chuong`, label: 'Quản lý chương', icon: ListOrdered },
        { href: `/tac-gia/truyen/${storyId}/sua`, label: 'Sửa truyện', icon: Pencil },
        { href: `/tac-gia/truyen/${storyId}/thong-ke`, label: 'Thống kê', icon: BarChart3 },
    ];

    return (
        <section
            className={`rounded-2xl border border-primary/30 bg-primary/5 p-3 md:p-4 ${className}`}
            aria-label="Công cụ tác giả"
        >
            <div className="flex items-center gap-2 mb-2.5">
                <PenLine size={16} className="text-primary flex-shrink-0" />
                <p className="text-sm font-semibold text-on-surface">
                    Bạn là tác giả truyện này
                    {!isPublished && (
                        <span className="ml-2 px-2 py-0.5 rounded text-[11px] font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 align-middle">
                            Chưa xuất bản
                        </span>
                    )}
                </p>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                {actions.map((a) => {
                    const Icon = a.icon;
                    return (
                        <Link
                            key={a.href}
                            href={a.href}
                            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors active:scale-[0.98] ${
                                a.primary
                                    ? 'bg-primary text-on-primary hover:bg-primary/90'
                                    : 'bg-surface-container text-on-surface border border-outline-variant hover:bg-surface-container-high'
                            }`}
                        >
                            <Icon size={16} className="flex-shrink-0" />
                            {a.label}
                        </Link>
                    );
                })}
            </div>
            {!isPublished && (
                <p className="mt-2.5 text-xs text-on-surface-variant">
                    {noChapters
                        ? 'Truyện cần ít nhất 1 chương rồi mới gửi duyệt được. Vào Kênh tác giả để bấm "Gửi duyệt".'
                        : 'Đã có chương? Vào Kênh tác giả và bấm "Gửi duyệt" để admin duyệt và hiển thị công khai.'}
                    {' '}
                    <Link href="/tac-gia/bang-dieu-khien" className="text-primary font-medium hover:underline">
                        Mở Kênh tác giả
                    </Link>
                </p>
            )}
        </section>
    );
}
