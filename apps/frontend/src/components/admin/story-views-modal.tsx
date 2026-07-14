'use client';

import { useEffect } from 'react';
import { BarChart } from '@/components/admin/charts';
import { useStoryViewsByMonth } from '@/lib/api/hooks/use-statistics';

interface StoryViewsModalProps {
    storyId: string;
    storyTitle: string;
    onClose: () => void;
}

/**
 * Popup thống kê lượt xem theo tháng của một truyện (đếm từ view_logs).
 * Mở từ cột "Lượt xem" trong bảng Top truyện xem nhiều nhất.
 */
export function StoryViewsModal({ storyId, storyTitle, onClose }: StoryViewsModalProps) {
    const { data, isLoading, isError } = useStoryViewsByMonth(storyId);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    const totalLogged = data ? data.data.reduce((sum, n) => sum + n, 0) : 0;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={`Thống kê lượt xem theo tháng: ${storyTitle}`}
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-surface-container rounded-lg shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 p-6 pb-4">
                    <div>
                        <h3 className="text-lg font-bold text-on-surface">Lượt xem theo tháng</h3>
                        <p className="text-sm text-on-surface-variant mt-1">{storyTitle}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Đóng"
                        className="p-2 -m-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="px-6 pb-6 space-y-4">
                    {isLoading && (
                        <div className="h-64 flex items-center justify-center text-on-surface-variant">
                            Đang tải thống kê...
                        </div>
                    )}

                    {isError && (
                        <div className="h-64 flex items-center justify-center text-on-surface-variant">
                            Không tải được thống kê lượt xem.
                        </div>
                    )}

                    {data && (
                        <>
                            <BarChart
                                data={data.data}
                                labels={data.labels}
                                title="Lượt xem theo tháng (12 tháng gần nhất)"
                                color="#10b981"
                            />

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-surface-container-low">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Tháng</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-on-surface-variant uppercase tracking-wider">Lượt xem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-outline-variant">
                                        {data.labels.map((label, idx) => (
                                            <tr key={label}>
                                                <td className="px-4 py-2 text-sm text-on-surface">{label}</td>
                                                <td className="px-4 py-2 text-sm text-on-surface text-right">
                                                    {data.data[idx].toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-outline-variant">
                                            <td className="px-4 py-2 text-sm font-medium text-on-surface">Tổng (có log)</td>
                                            <td className="px-4 py-2 text-sm font-medium text-on-surface text-right">
                                                {totalLogged.toLocaleString()}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-2 text-sm text-on-surface-variant">Tổng lượt xem toàn thời gian</td>
                                            <td className="px-4 py-2 text-sm text-on-surface-variant text-right">
                                                {data.story.viewCount.toLocaleString()}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {totalLogged < data.story.viewCount && (
                                <p className="text-xs text-on-surface-variant">
                                    Thống kê theo tháng chỉ tính từ khi hệ thống bắt đầu ghi log lượt xem,
                                    nên tổng theo tháng có thể nhỏ hơn tổng lượt xem toàn thời gian.
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
