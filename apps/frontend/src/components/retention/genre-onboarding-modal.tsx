'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useCategories } from '@/lib/api/hooks/use-categories';
import { useSetFavoriteCategories, useUserPreferences } from '@/lib/api/hooks/use-rewards';

const MAX_PICK = 10;

/**
 * Hỏi người dùng (một lần) thích thể loại nào → mục "Dành cho bạn" có gợi ý
 * ngay cả khi chưa đọc truyện nào. "Bỏ qua" cũng đánh dấu đã hỏi.
 */
export function GenreOnboardingModal() {
    const { data: prefs } = useUserPreferences(true);
    const { data: categories = [] } = useCategories();
    const save = useSetFavoriteCategories();
    const [open, setOpen] = useState(false);
    const [picked, setPicked] = useState<string[]>([]);

    // Hiện sau một nhịp để không chen ngang lúc trang vừa tải.
    useEffect(() => {
        if (!prefs || prefs.genreOnboarded) return;
        const t = setTimeout(() => setOpen(true), 1500);
        return () => clearTimeout(t);
    }, [prefs]);

    if (!prefs || prefs.genreOnboarded || categories.length === 0) return null;

    const toggle = (id: string) =>
        setPicked((prev) =>
            prev.indexOf(id) !== -1 ? prev.filter((x) => x !== id) : prev.length >= MAX_PICK ? prev : [...prev, id],
        );

    const finish = (ids: string[]) => {
        save.mutate(ids, { onSettled: () => setOpen(false) });
    };

    return (
        <BottomSheet open={open} onClose={() => finish([])} title="Bạn thích đọc thể loại nào?">
            <div className="px-5 pb-5 overflow-y-auto">
                <p className="text-sm text-on-surface-variant mb-4">
                    Chọn vài thể loại để YÊU gợi ý truyện hợp gu bạn ngay từ đầu.
                </p>
                <div className="flex flex-wrap gap-2 mb-5">
                    {categories.map((c: any) => {
                        const on = picked.indexOf(c.id) !== -1;
                        return (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => toggle(c.id)}
                                aria-pressed={on}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${on
                                    ? 'bg-primary text-on-primary border-transparent'
                                    : 'bg-surface-container-high text-on-surface border-outline-variant/60 hover:bg-surface-container-highest'
                                    }`}
                            >
                                {on && <Check size={14} />}
                                {c.name}
                            </button>
                        );
                    })}
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => finish([])}
                        disabled={save.isPending}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant bg-surface-container-high hover:bg-surface-container-highest"
                    >
                        Bỏ qua
                    </button>
                    <button
                        type="button"
                        onClick={() => finish(picked)}
                        disabled={picked.length === 0 || save.isPending}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-on-primary disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    >
                        {save.isPending && <Loader2 size={16} className="animate-spin" />}
                        Xong{picked.length > 0 ? ` (${picked.length})` : ''}
                    </button>
                </div>
            </div>
        </BottomSheet>
    );
}
