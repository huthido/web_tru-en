'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Download, Loader2, X, Check, Minus, Plus } from 'lucide-react';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { useWalletBalance } from '@/lib/api/hooks/use-wallet';
import { useToastContext } from '@/components/providers/toast-provider';
import { useStoryItems, useBuyStoryItem } from '@/lib/api/hooks/use-story-items';
import { storyItemsService, StoryItemPublic } from '@/lib/api/story-items.service';

export function StoryItemsSection({ storyId }: { storyId: string }) {
    const { data: items } = useStoryItems(storyId);
    const [buying, setBuying] = useState<StoryItemPublic | null>(null);

    if (!items || items.length === 0) return null;

    return (
        <section className="mt-8">
            <h2 className="font-display text-lg md:text-xl font-bold text-on-surface mb-4 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                Vật phẩm
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {items.map((it) => (
                    <ItemCard key={it.id} item={it} onBuy={() => setBuying(it)} />
                ))}
            </div>
            {buying && (
                <BuyModal storyId={storyId} item={buying} onClose={() => setBuying(null)} />
            )}
        </section>
    );
}

function ItemCard({ item, onBuy }: { item: StoryItemPublic; onBuy: () => void }) {
    const { showToast } = useToastContext();
    const [downloading, setDownloading] = useState(false);
    const soldOut = item.remaining !== null && item.remaining <= 0;

    const download = async () => {
        setDownloading(true);
        try {
            const { url } = await storyItemsService.getDownload(item.id);
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (e: any) {
            showToast(e?.response?.data?.error || 'Không tải được file', 'error');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="bg-surface-container rounded-xl overflow-hidden border border-outline-variant flex flex-col">
            <div className="relative aspect-square bg-surface-variant">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                {item.ownedQuantity > 0 && (
                    <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary text-on-primary">
                        <Check className="w-3 h-3" /> Đã có {item.ownedQuantity}
                    </span>
                )}
            </div>
            <div className="p-3 flex flex-col gap-1.5 flex-1">
                <h3 className="text-sm font-semibold text-on-surface line-clamp-1">{item.name}</h3>
                {item.description && (
                    <p className="text-xs text-on-surface-variant line-clamp-2">{item.description}</p>
                )}
                <div className="mt-auto pt-1.5 flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-primary whitespace-nowrap">{item.price.toLocaleString('vi-VN')} xu</span>
                    {item.remaining !== null && (
                        <span className={`text-xs ${soldOut ? 'text-error' : 'text-on-surface-variant'}`}>
                            {soldOut ? 'Hết hàng' : `Còn ${item.remaining}`}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <button
                        type="button"
                        onClick={onBuy}
                        disabled={soldOut}
                        className="flex-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary hover:bg-primary/90 text-on-primary transition-colors disabled:opacity-50"
                    >
                        Mua
                    </button>
                    {item.hasFile && item.ownedQuantity > 0 && (
                        <button
                            type="button"
                            onClick={download}
                            disabled={downloading}
                            title="Tải file"
                            className="px-2.5 py-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-50"
                        >
                            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function BuyModal({ storyId, item, onClose }: { storyId: string; item: StoryItemPublic; onClose: () => void }) {
    const router = useRouter();
    const { user } = useAuth();
    const { showToast } = useToastContext();
    const { data: balanceData } = useWalletBalance(!!user);
    const buyMutation = useBuyStoryItem(storyId);
    const [qty, setQty] = useState(1);

    const maxQty = item.remaining !== null ? Math.max(1, Math.min(item.remaining, 999)) : 999;
    const total = item.price * qty;
    const balance = (balanceData as any)?.balance ?? (balanceData as any)?.coins ?? null;
    const notEnough = typeof balance === 'number' && balance < total;

    const confirm = async () => {
        if (!user) {
            router.push('/dang-nhap?redirect=' + encodeURIComponent(window.location.pathname));
            return;
        }
        try {
            await buyMutation.mutateAsync({ id: item.id, quantity: qty });
            showToast(`Đã mua "${item.name}"${qty > 1 ? ` x${qty}` : ''}`, 'success');
            onClose();
        } catch (e: any) {
            showToast(e?.response?.data?.error || 'Mua vật phẩm thất bại', 'error');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="bg-surface-container rounded-2xl w-full max-w-sm p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-3 mb-4">
                    <h3 className="font-display text-lg font-bold text-on-surface">Mua vật phẩm</h3>
                    <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface"><X className="w-5 h-5" /></button>
                </div>

                <div className="flex gap-3 mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.imageUrl} alt={item.name} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                    <div className="min-w-0">
                        <p className="font-semibold text-on-surface">{item.name}</p>
                        {item.description && <p className="text-xs text-on-surface-variant line-clamp-2 mt-0.5">{item.description}</p>}
                        <p className="text-sm font-bold text-primary mt-1">{item.price.toLocaleString('vi-VN')} xu</p>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-on-surface-variant">Số lượng</span>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-1.5 rounded-lg border border-outline-variant disabled:opacity-40" disabled={qty <= 1}><Minus className="w-4 h-4" /></button>
                        <span className="w-10 text-center font-semibold text-on-surface">{qty}</span>
                        <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} className="p-1.5 rounded-lg border border-outline-variant disabled:opacity-40" disabled={qty >= maxQty}><Plus className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-on-surface-variant">Tổng</span>
                    <span className="text-lg font-bold text-primary">{total.toLocaleString('vi-VN')} xu</span>
                </div>
                {typeof balance === 'number' && (
                    <p className="text-xs text-on-surface-variant mb-4">Số dư: {balance.toLocaleString('vi-VN')} xu</p>
                )}

                {notEnough ? (
                    <button type="button" onClick={() => router.push('/vi-xu')} className="w-full px-4 py-2.5 rounded-lg font-medium bg-primary hover:bg-primary/90 text-on-primary transition-colors">
                        Không đủ xu — Nạp thêm
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={confirm}
                        disabled={buyMutation.isPending}
                        className="w-full px-4 py-2.5 rounded-lg font-medium bg-primary hover:bg-primary/90 text-on-primary transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    >
                        {buyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
                        {user ? `Mua (${total.toLocaleString('vi-VN')} xu)` : 'Đăng nhập để mua'}
                    </button>
                )}
            </div>
        </div>
    );
}
