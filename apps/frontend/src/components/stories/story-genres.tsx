'use client';

import Link from 'next/link';
import { useState } from 'react';

interface Genre {
    name: string;
    slug?: string;
}

interface StoryGenresProps {
    genres: Genre[];
    /** Số thể loại hiện trước khi gom vào nút "+N". */
    limit?: number;
}

/** Danh sách thể loại dạng chip, rút gọn khi truyện gắn quá nhiều thể loại. */
export function StoryGenres({ genres, limit = 3 }: StoryGenresProps) {
    const [expanded, setExpanded] = useState(false);

    if (genres.length === 0) {
        return <p className="text-base font-medium text-on-surface">Chưa phân loại</p>;
    }

    const hidden = genres.length - limit;
    const visible = expanded || hidden <= 0 ? genres : genres.slice(0, limit);
    const chipClass =
        'inline-block max-w-full truncate px-2 py-0.5 rounded-full text-xs font-medium bg-surface-container-high text-on-surface';

    return (
        <div className="flex flex-wrap gap-1">
            {visible.map((g) =>
                g.slug ? (
                    <Link
                        key={g.slug}
                        href={`/truyen?category=${encodeURIComponent(g.slug)}`}
                        className={`${chipClass} hover:text-primary`}
                    >
                        {g.name}
                    </Link>
                ) : (
                    <span key={g.name} className={chipClass}>
                        {g.name}
                    </span>
                )
            )}
            {hidden > 0 && (
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="px-2 py-0.5 rounded-full text-xs font-medium text-primary hover:underline"
                >
                    {expanded ? 'Thu gọn' : `+${hidden}`}
                </button>
            )}
        </div>
    );
}
