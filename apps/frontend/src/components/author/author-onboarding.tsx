'use client';

import Link from 'next/link';
import { BookPlus, FilePlus2, Send, ArrowRight } from 'lucide-react';

const STEPS = [
    {
        icon: BookPlus,
        title: 'Tạo truyện',
        desc: 'Đặt tên, chọn thể loại, thêm ảnh bìa và mô tả ngắn.',
    },
    {
        icon: FilePlus2,
        title: 'Viết chương đầu tiên',
        desc: 'Mỗi chương tối thiểu 100 ký tự. Có thể lưu nháp và viết tiếp sau.',
    },
    {
        icon: Send,
        title: 'Gửi duyệt',
        desc: 'Bấm "Gửi duyệt" ở Kênh tác giả. Admin duyệt xong truyện hiển thị công khai.',
    },
];

/**
 * Hướng dẫn 3 bước cho tài khoản chưa có truyện nào — thay cho dòng
 * "Bạn chưa có truyện nào" khô khan. Hiện ở Kênh tác giả (mobile lẫn desktop).
 */
export function AuthorOnboarding() {
    return (
        <section className="bg-surface-container rounded-2xl border border-outline-variant p-5 md:p-8">
            <h2 className="font-display text-xl md:text-2xl font-bold text-on-surface mb-1">
                Đăng truyện đầu tiên chỉ mất 3 bước
            </h2>
            <p className="text-sm text-on-surface-variant mb-5">
                Bạn chưa có truyện nào. Làm theo thứ tự dưới đây, mỗi bước chỉ vài phút.
            </p>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                {STEPS.map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <li key={s.title} className="flex md:flex-col gap-3 p-4 rounded-xl bg-surface-container-high/60">
                            <span className="relative w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                                <Icon size={20} />
                                <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-primary text-on-primary text-[11px] font-bold flex items-center justify-center">
                                    {i + 1}
                                </span>
                            </span>
                            <span>
                                <span className="block text-sm font-semibold text-on-surface">{s.title}</span>
                                <span className="block text-xs text-on-surface-variant mt-0.5">{s.desc}</span>
                            </span>
                        </li>
                    );
                })}
            </ol>
            <Link
                href="/tac-gia/truyen/tao"
                className="inline-flex w-full md:w-auto items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-on-primary rounded-xl font-semibold transition-colors"
            >
                Bắt đầu: Tạo truyện
                <ArrowRight size={18} />
            </Link>
        </section>
    );
}
