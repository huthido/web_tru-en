'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loading } from '@/components/ui/loading';
import { RefreshButton } from '@/components/admin/refresh-button';
import { useToast } from '@/components/ui/toast';
import { ttsService, type TtsAdminQueueItem } from '@/lib/api/tts.service';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Chờ xử lý', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
    PROCESSING: { label: 'Đang tạo', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
    READY: { label: 'Đã có audio', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    FAILED: { label: 'Lỗi', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
};

function StatCard({ label, value, color, active }: { label: string; value: number; color: string; active?: boolean }) {
    const ring = active ? 'ring-2 ring-primary/30' : '';
    return (
        <div className={`bg-surface-container rounded-lg p-4 border border-outline-variant ${ring}`}>
            <p className="text-sm text-on-surface-variant">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value.toLocaleString()}</p>
        </div>
    );
}

const FILTERS = [
    { value: '', label: 'Chờ/Lỗi (mặc định)' },
    { value: 'PENDING', label: 'Chờ xử lý' },
    { value: 'PROCESSING', label: 'Đang tạo' },
    { value: 'FAILED', label: 'Lỗi' },
    { value: 'READY', label: 'Đã hoàn thành' },
];

export default function AdminTtsPage() {
    const queryClient = useQueryClient();
    const { showToast } = useToast();
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [resettingId, setResettingId] = useState<string | null>(null);

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['admin', 'tts', 'stats'],
        queryFn: () => ttsService.getAdminStats(),
        refetchInterval: 10_000,
    });

    const { data: queue, isLoading: queueLoading } = useQuery({
        queryKey: ['admin', 'tts', 'queue', page, statusFilter, search],
        queryFn: () => ttsService.getAdminQueue({ page, status: statusFilter || undefined, search: search || undefined, limit: 30 }),
        refetchInterval: 10_000,
    });

    const isBusy = (stats?.pending ?? 0) > 0 || (stats?.processing ?? 0) > 0;

    const handleSearch = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        setSearch(searchInput);
    }, [searchInput]);

    const handleReset = async (ch: TtsAdminQueueItem) => {
        setResettingId(ch.id);
        try {
            await ttsService.adminResetChapterTts(ch.id);
            queryClient.invalidateQueries({ queryKey: ['admin', 'tts'] });
            showToast('Đã xoá audio TTS — chương sẽ được tạo lại khi có worker trống', 'success');
        } catch (err: any) {
            showToast(err?.response?.data?.error || 'Lỗi khi xoá audio TTS', 'error');
        } finally {
            setResettingId(null);
        }
    };

    if (statsLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loading message="Đang tải hàng chờ TTS..." />
            </div>
        );
    }

    const workerDot = stats?.enabled ? 'bg-green-500' : 'bg-red-500';
    const bullDot = stats?.queueEnabled ? 'bg-green-500' : 'bg-yellow-500';
    const workerLabel = stats?.enabled ? `${stats.workerCount} máy` : 'Tắt';
    const bullLabel = stats?.queueEnabled ? 'Bật' : 'Tắt (inline)';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-on-surface">Hàng chờ TTS</h1>
                    <p className="text-on-surface-variant mt-1">Theo dõi giọng đọc AI — chương đang chờ, đang xử lý, lỗi</p>
                </div>
                <RefreshButton queryKeys={[['admin', 'tts']]} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard label="Chờ xử lý" value={stats?.pending ?? 0} color="text-yellow-600 dark:text-yellow-400" active={(stats?.pending ?? 0) > 0} />
                <StatCard label="Đang tạo" value={stats?.processing ?? 0} color="text-blue-600 dark:text-blue-400" active={(stats?.processing ?? 0) > 0} />
                <StatCard label="Lỗi" value={stats?.failed ?? 0} color="text-red-600 dark:text-red-400" active={(stats?.failed ?? 0) > 0} />
                <StatCard label="Đã hoàn thành" value={stats?.ready ?? 0} color="text-green-600 dark:text-green-400" />
                <StatCard label="Chưa yêu cầu" value={stats?.none ?? 0} color="text-on-surface-variant" />
            </div>

            <div className="bg-surface-container rounded-lg p-4 border border-outline-variant flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${workerDot}`} />
                    Worker TTS: {workerLabel}
                </span>
                <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${bullDot}`} />
                    BullMQ: {bullLabel}
                </span>
                <span>Tổng chương: {stats?.total?.toLocaleString() ?? 0}</span>
                {isBusy && (
                    <span className="text-blue-600 dark:text-blue-400 font-medium animate-pulse">
                        Đang có job chạy…
                    </span>
                )}
            </div>

            <div className="bg-surface-container rounded-lg p-4 border border-outline-variant">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex gap-1.5 flex-wrap">
                        {FILTERS.map((opt) => {
                            const a = statusFilter === opt.value;
                            const cls = a ? 'bg-primary text-on-primary' : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant';
                            return (
                                <button
                                    key={opt.value}
                                    onClick={() => { setStatusFilter(opt.value); setPage(1); }}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${cls}`}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>
                    <form onSubmit={handleSearch} className="flex gap-2 ml-auto">
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Tìm tên chương / truyện..."
                            className="px-3 py-1.5 border border-outline-variant rounded-lg bg-surface text-on-surface text-sm focus:ring-2 focus:ring-primary focus:border-transparent w-56"
                        />
                        <button
                            type="submit"
                            className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest rounded-lg text-sm font-medium text-on-surface-variant transition-colors"
                        >
                            Tìm
                        </button>
                    </form>
                </div>
            </div>

            <div className="bg-surface-container rounded-lg border border-outline-variant overflow-hidden">
                {queueLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loading />
                    </div>
                ) : !queue?.items?.length ? (
                    <div className="text-center py-12 text-on-surface-variant">
                        Không có chương nào trong hàng chờ
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-outline-variant bg-surface-container-high">
                                    <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Chương</th>
                                    <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Truyện</th>
                                    <th className="text-center px-4 py-3 font-medium text-on-surface-variant">Trạng thái</th>
                                    <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Giọng</th>
                                    <th className="text-center px-4 py-3 font-medium text-on-surface-variant">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {queue.items.map((item) => {
                                    const s = STATUS_LABELS[item.ttsAudioStatus || ''] || { label: item.ttsAudioStatus || '—', color: 'bg-gray-100 text-gray-800' };
                                    return (
                                        <tr key={item.id} className="border-b border-outline-variant/50 hover:bg-surface-container-high/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-on-surface">{item.title}</div>
                                                <div className="text-xs text-on-surface-variant">#{item.order}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <a
                                                    href={`/tac-gia/truyen/${item.story.id}/chuong`}
                                                    className="text-primary hover:underline"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    {item.story.title}
                                                </a>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>
                                                    {s.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-on-surface-variant text-xs">
                                                {item.ttsVoiceName || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <a
                                                        href={`/truyen/${item.story.slug}/chuong/${item.slug}`}
                                                        className="px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        Xem
                                                    </a>
                                                    {item.ttsAudioStatus === 'FAILED' && (
                                                        <button
                                                            onClick={() => handleReset(item)}
                                                            disabled={resettingId === item.id}
                                                            className="px-3 py-1.5 text-xs font-medium text-primary hover:bg-surface-container-high rounded-lg transition-colors disabled:opacity-50"
                                                        >
                                                            {resettingId === item.id ? 'Đang xoá...' : 'Xoá & tạo lại'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {queue && queue.pages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant">
                        <p className="text-sm text-on-surface-variant">
                            Trang {queue.page}/{queue.pages} — {queue.total} chương
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="px-3 py-1.5 text-sm rounded-lg border border-outline-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors"
                            >
                                Trước
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(queue.pages, p + 1))}
                                disabled={page >= queue.pages}
                                className="px-3 py-1.5 text-sm rounded-lg border border-outline-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
