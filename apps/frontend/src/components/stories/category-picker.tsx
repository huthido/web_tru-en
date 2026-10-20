'use client';

import { useMemo, useState } from 'react';

interface CategoryOption {
    id: string;
    name: string;
}

/** Số thể loại tối đa mỗi truyện — khớp ArrayMaxSize ở backend DTO. */
export const MAX_STORY_CATEGORIES = 10;

interface CategoryPickerProps {
    categories: CategoryOption[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    max?: number;
}

// Dải dấu thanh kết hợp U+0300–U+036F (tách sau normalize('NFD')).
const COMBINING_MARKS = new RegExp(
    '[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']',
    'g'
);

// Bỏ dấu để gõ "kiem hiep" vẫn ra "Kiếm Hiệp".
function normalize(text: string) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(COMBINING_MARKS, '')
        .replace(/đ/g, 'd');
}

/**
 * Bộ chọn thể loại dạng chip: gọn hơn nhiều so với lưới checkbox,
 * có ô tìm kiếm và khung cuộn giới hạn chiều cao.
 */
export function CategoryPicker({
    categories,
    selectedIds,
    onChange,
    max = MAX_STORY_CATEGORIES,
}: CategoryPickerProps) {
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        const q = normalize(query.trim());
        if (!q) return categories;
        return categories.filter((c) => normalize(c.name).indexOf(q) !== -1);
    }, [categories, query]);

    const selected = useMemo(
        () => categories.filter((c) => selectedIds.includes(c.id)),
        [categories, selectedIds]
    );

    const full = selectedIds.length >= max;
    const over = selectedIds.length > max;

    const toggle = (id: string) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter((x) => x !== id));
        } else if (!full) {
            onChange([...selectedIds, id]);
        }
    };

    if (categories.length === 0) {
        return (
            <p className="text-sm text-on-surface-variant">
                Chưa có thể loại nào. Vui lòng liên hệ admin để thêm thể loại.
            </p>
        );
    }

    return (
        <div className="rounded-xl border border-outline-variant p-3">
            <div className="flex items-center gap-2 mb-2">
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Tìm thể loại..."
                    className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-outline-variant rounded-lg bg-surface-container text-on-surface placeholder:text-on-surface-variant focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <span
                    className={`text-xs whitespace-nowrap ${over ? 'text-red-600 dark:text-red-400 font-medium' : 'text-on-surface-variant'}`}
                >
                    {selected.length}/{max}
                </span>
                {selected.length > 0 && (
                    <button
                        type="button"
                        onClick={() => onChange([])}
                        className="text-xs text-primary hover:underline whitespace-nowrap"
                    >
                        Bỏ chọn
                    </button>
                )}
            </div>

            {over && (
                <p className="text-xs text-red-600 dark:text-red-400 mb-2">
                    Mỗi truyện chỉ được tối đa {max} thể loại. Hãy bỏ bớt {selectedIds.length - max} thể loại để lưu.
                </p>
            )}

            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1">
                {filtered.map((category) => {
                    const active = selectedIds.includes(category.id);
                    const locked = !active && full;
                    return (
                        <button
                            key={category.id}
                            type="button"
                            onClick={() => toggle(category.id)}
                            disabled={locked}
                            aria-pressed={active}
                            title={locked ? `Đã đủ ${max} thể loại` : undefined}
                            className={`px-3 py-1 rounded-full text-xs sm:text-sm border transition-colors ${active
                                ? 'bg-primary text-on-primary border-primary'
                                : locked
                                    ? 'border-outline-variant text-on-surface-variant opacity-40 cursor-not-allowed'
                                    : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
                                }`}
                        >
                            {active ? '✓ ' : ''}
                            {category.name}
                        </button>
                    );
                })}
                {filtered.length === 0 && (
                    <p className="text-xs text-on-surface-variant py-1">Không tìm thấy thể loại phù hợp.</p>
                )}
            </div>
        </div>
    );
}
