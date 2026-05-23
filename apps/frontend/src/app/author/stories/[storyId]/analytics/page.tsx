'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loading } from '@/components/ui/loading';
import { BarChart } from '@/components/admin/charts';
import { useStory } from '@/lib/api/hooks/use-stories';
import { useStoryStats } from '@/lib/api/hooks/use-statistics';

interface ChapterLite {
    id: string;
    title: string;
    order: number;
    viewCount: number;
    isPublished?: boolean;
}

export default function AuthorStoryAnalyticsPage() {
    const params = useParams();
    const storyId = params.storyId as string;

    const { data: story, isLoading: storyLoading } = useStory(storyId);
    const { data: stats, isLoading: statsLoading } = useStoryStats(storyId);

    const chapters: ChapterLite[] = useMemo(() => {
        const list = (story as any)?.chapters ?? [];
        return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }, [story]);

    const topChapters = useMemo(() => {
        return [...chapters]
            .sort((a, b) => b.viewCount - a.viewCount)
            .slice(0, 10);
    }, [chapters]);

    const chapterChart = useMemo(() => {
        const sample = chapters.slice(0, 30);
        return {
            labels: sample.map((ch) => `C.${ch.order}`),
            data: sample.map((ch) => ch.viewCount),
        };
    }, [chapters]);

    const isLoading = storyLoading || statsLoading;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <Link href="/author/dashboard" className="text-sm text-primary hover:underline">
                    ← Quay lại bảng điều khiển
                </Link>
                <h1 className="text-2xl sm:text-3xl font-bold text-on-surface mt-2">
                    Thống kê: {story?.title || 'Truyện'}
                </h1>
                <p className="text-sm text-on-surface-variant mt-1">
                    Tổng quan lượt đọc và phân tích theo chương
                </p>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loading />
                </div>
            ) : !stats ? (
                <div className="bg-surface-container rounded-lg p-6 text-center text-on-surface-variant">
                    Không có dữ liệu thống kê cho truyện này.
                </div>
            ) : (
                <>
                    {/* Aggregate stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard label="Lượt đọc truyện" value={stats.story?.viewCount ?? 0} />
                        <StatCard label="Tổng lượt đọc chương" value={stats.views?.chapters ?? 0} />
                        <StatCard label="Theo dõi" value={stats.story?.followCount ?? stats.counts?.follows ?? 0} />
                        <StatCard label="Yêu thích" value={stats.counts?.favorites ?? 0} />
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard label="Số chương" value={stats.counts?.chapters ?? 0} />
                        <StatCard
                            label="Đánh giá TB"
                            value={`${(stats.story?.rating ?? 0).toFixed(1)} (${stats.counts?.ratings ?? 0})`}
                        />
                        <StatCard label="Bình luận" value={stats.counts?.comments ?? 0} />
                        <StatCard
                            label="Bình luận 30 ngày"
                            value={stats.counts?.recentComments ?? 0}
                        />
                    </div>

                    {/* Chapter view chart */}
                    {chapters.length > 0 && (
                        <BarChart
                            data={chapterChart.data}
                            labels={chapterChart.labels}
                            title={`Lượt đọc theo chương${chapters.length > 30 ? ' (30 chương đầu)' : ''}`}
                            color="#3b82f6"
                        />
                    )}

                    {/* Top chapters table */}
                    {topChapters.length > 0 && (
                        <div className="bg-surface-container rounded-lg p-6 shadow-sm">
                            <h2 className="text-lg font-semibold text-on-surface mb-4">
                                Top chương được đọc nhiều nhất
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-xs uppercase text-on-surface-variant border-b border-outline-variant">
                                            <th className="py-2 w-12">#</th>
                                            <th className="py-2">Chương</th>
                                            <th className="py-2 text-right">Lượt đọc</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-outline-variant">
                                        {topChapters.map((ch, idx) => (
                                            <tr key={ch.id}>
                                                <td className="py-2 text-on-surface-variant">{idx + 1}</td>
                                                <td className="py-2 text-on-surface truncate">
                                                    C.{ch.order} — {ch.title}
                                                </td>
                                                <td className="py-2 text-right text-on-surface">
                                                    {ch.viewCount.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="bg-surface-container rounded-lg p-5 shadow-sm">
            <div className="text-sm text-on-surface-variant">{label}</div>
            <div className="text-2xl sm:text-3xl font-bold text-on-surface mt-1">
                {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
        </div>
    );
}
