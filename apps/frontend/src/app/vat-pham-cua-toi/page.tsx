'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Package, Download, Loader2 } from 'lucide-react';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Loading } from '@/components/ui/loading';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { useToastContext } from '@/components/providers/toast-provider';
import { useMyStoryItems } from '@/lib/api/hooks/use-story-items';
import { storyItemsService, MyStoryItem } from '@/lib/api/story-items.service';

export default function MyItemsPage() {
    return (
        <ProtectedRoute>
            <Inner />
        </ProtectedRoute>
    );
}

function Inner() {
    const { data: items, isLoading } = useMyStoryItems();
    const { showToast } = useToastContext();
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const download = async (it: MyStoryItem) => {
        setDownloadingId(it.itemId);
        try {
            const { url } = await storyItemsService.getDownload(it.itemId);
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (e: any) {
            showToast(e?.response?.data?.error || 'Không tải được file', 'error');
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-background text-on-surface">
            <Sidebar />
            <div className="md:ml-60 pb-16 md:pb-0">
                <Header />
                <main className="max-w-4xl mx-auto px-4 md:px-6 py-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
                        <Package className="w-6 h-6 text-primary" />
                        Kho vật phẩm của tôi
                    </h1>

                    {isLoading ? (
                        <div className="py-16"><Loading /></div>
                    ) : !items || items.length === 0 ? (
                        <div className="bg-surface-container rounded-xl p-10 text-center text-on-surface-variant">
                            Bạn chưa mua vật phẩm nào. Khám phá vật phẩm ở trang truyện.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {items.map((it) => (
                                <div key={it.itemId} className="bg-surface-container rounded-xl p-3 flex gap-3 items-center border border-outline-variant">
                                    {it.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={it.imageUrl} alt={it.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-lg bg-surface-variant flex items-center justify-center flex-shrink-0"><Package className="w-6 h-6 text-on-surface-variant" /></div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold truncate">{it.name}</p>
                                        <p className="text-sm text-on-surface-variant">Số lượng: {it.quantity}</p>
                                        {it.storySlug && it.storyTitle && (
                                            <Link href={`/truyen/${it.storySlug}`} className="text-xs text-primary hover:underline truncate block">{it.storyTitle}</Link>
                                        )}
                                    </div>
                                    {it.hasFile && (
                                        <button
                                            type="button"
                                            onClick={() => download(it)}
                                            disabled={downloadingId === it.itemId}
                                            className="px-3 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-high text-sm inline-flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {downloadingId === it.itemId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                            Tải
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
