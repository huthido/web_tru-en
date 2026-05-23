'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loading } from '@/components/ui/loading';
import { BarChart, DoughnutChart, LineChart } from '@/components/admin/charts';
import { useAd, useAdAnalytics } from '@/lib/api/hooks/use-ads';

function todayISO(): string {
    return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
}

export default function AdAnalyticsPage() {
    const params = useParams();
    const id = params.id as string;

    const [from, setFrom] = useState<string>(daysAgoISO(30));
    const [to, setTo] = useState<string>(todayISO());

    const { data: ad } = useAd(id);
    const { data: analytics, isLoading, error } = useAdAnalytics(id, { from, to });

    const dailyChart = useMemo(() => {
        if (!analytics?.dailyData) return { labels: [], impressions: [], clicks: [] };
        return {
            labels: analytics.dailyData.map((d) => d.date.slice(5)),
            impressions: analytics.dailyData.map((d) => d.impressions),
            clicks: analytics.dailyData.map((d) => d.clicks),
        };
    }, [analytics]);

    const hourlyChart = useMemo(() => {
        if (!analytics?.hourlyData) return { labels: [], impressions: [] };
        const sorted = [...analytics.hourlyData].sort((a, b) => Number(a.hour) - Number(b.hour));
        return {
            labels: sorted.map((h) => `${h.hour}h`),
            impressions: sorted.map((h) => Number(h.impressions)),
        };
    }, [analytics]);

    const deviceChart = useMemo(() => {
        if (!analytics?.stats.deviceBreakdown) return { labels: [], data: [] };
        return {
            labels: analytics.stats.deviceBreakdown.map((d) => d.device),
            data: analytics.stats.deviceBreakdown.map((d) => d.count),
        };
    }, [analytics]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <Link href="/admin/ads" className="text-sm text-primary hover:underline">
                        ← Quay lại danh sách quảng cáo
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-bold text-on-surface mt-2">
                        Thống kê: {ad?.title || 'Quảng cáo'}
                    </h1>
                    <p className="text-sm text-on-surface-variant mt-1">
                        {ad ? `${ad.type} · ${ad.position}` : ''}
                    </p>
                </div>
                <div className="flex gap-3">
                    <div>
                        <label className="block text-xs text-on-surface-variant mb-1">Từ</label>
                        <input
                            type="date"
                            value={from}
                            max={to}
                            onChange={(e) => setFrom(e.target.value)}
                            className="px-3 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-on-surface-variant mb-1">Đến</label>
                        <input
                            type="date"
                            value={to}
                            min={from}
                            max={todayISO()}
                            onChange={(e) => setTo(e.target.value)}
                            className="px-3 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface text-sm"
                        />
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loading />
                </div>
            ) : error ? (
                <div className="bg-surface-container rounded-lg p-6 text-center text-on-surface-variant">
                    Không thể tải thống kê. Vui lòng thử lại sau.
                </div>
            ) : analytics ? (
                <>
                    {/* Stat cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard label="Lượt hiển thị" value={analytics.stats.totalImpressions} />
                        <StatCard label="Lượt click" value={analytics.stats.totalClicks} />
                        <StatCard label="CTR" value={`${analytics.stats.ctr.toFixed(2)}%`} />
                    </div>

                    {/* Daily charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <LineChart
                            data={dailyChart.impressions}
                            labels={dailyChart.labels}
                            title="Lượt hiển thị theo ngày"
                            color="#3b82f6"
                        />
                        <LineChart
                            data={dailyChart.clicks}
                            labels={dailyChart.labels}
                            title="Lượt click theo ngày"
                            color="#10b981"
                        />
                    </div>

                    {/* Hourly + Device */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <BarChart
                            data={hourlyChart.impressions}
                            labels={hourlyChart.labels}
                            title="Lượt hiển thị theo giờ"
                            color="#8b5cf6"
                        />
                        <DoughnutChart
                            data={deviceChart.data}
                            labels={deviceChart.labels}
                            title="Phân bổ theo thiết bị"
                        />
                    </div>

                    {/* Device detail table */}
                    {analytics.stats.deviceBreakdown.length > 0 && (
                        <div className="bg-surface-container rounded-lg p-6 shadow-sm">
                            <h2 className="text-lg font-semibold text-on-surface mb-4">Chi tiết theo thiết bị</h2>
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs uppercase text-on-surface-variant border-b border-outline-variant">
                                        <th className="py-2">Thiết bị</th>
                                        <th className="py-2 text-right">Lượt hiển thị</th>
                                        <th className="py-2 text-right">Tỉ lệ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant">
                                    {analytics.stats.deviceBreakdown.map((d) => (
                                        <tr key={d.device}>
                                            <td className="py-2 text-on-surface">{d.device}</td>
                                            <td className="py-2 text-right text-on-surface">{d.count.toLocaleString()}</td>
                                            <td className="py-2 text-right text-on-surface-variant">{d.percentage.toFixed(2)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            ) : null}
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="bg-surface-container rounded-lg p-5 shadow-sm">
            <div className="text-sm text-on-surface-variant">{label}</div>
            <div className="text-3xl font-bold text-on-surface mt-1">
                {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
        </div>
    );
}
