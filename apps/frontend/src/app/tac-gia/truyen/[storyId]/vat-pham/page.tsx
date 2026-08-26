'use client';

import { useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Loader2, Package, Upload, X, FileText } from 'lucide-react';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Loading } from '@/components/ui/loading';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { useToastContext } from '@/components/providers/toast-provider';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { useStory } from '@/lib/api/hooks/use-stories';
import {
    useManageStoryItems,
    useCreateStoryItem,
    useUpdateStoryItem,
    useRemoveStoryItem,
} from '@/lib/api/hooks/use-story-items';
import { storyItemsService, StoryItemManage, UpsertStoryItem } from '@/lib/api/story-items.service';

export default function StoryItemsManagePage() {
    return (
        <ProtectedRoute>
            <Inner />
        </ProtectedRoute>
    );
}

function Inner() {
    const params = useParams();
    const storyIdOrSlug = params.storyId as string;
    const { data: story, isLoading: storyLoading } = useStory(storyIdOrSlug);
    const storyId = (story as any)?.id as string | undefined;
    const { showToast } = useToastContext();

    const { data: items, isLoading } = useManageStoryItems(storyId || '');
    const removeMutation = useRemoveStoryItem(storyId || '');

    const [editing, setEditing] = useState<StoryItemManage | null>(null);
    const [creating, setCreating] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<StoryItemManage | null>(null);

    const doDelete = async () => {
        if (!deleteTarget) return;
        try {
            const r = await removeMutation.mutateAsync(deleteTarget.id);
            showToast(r?.message || 'Đã xoá vật phẩm', 'success');
        } catch (e: any) {
            showToast(e?.response?.data?.error || 'Xoá thất bại', 'error');
        } finally {
            setDeleteTarget(null);
        }
    };

    return (
        <div className="min-h-screen bg-background text-on-surface">
            <Sidebar />
            <div className="md:ml-60 pb-16 md:pb-0">
                <Header />
                <main className="max-w-5xl mx-auto px-4 md:px-6 py-6">
                    <div className="mb-6">
                        <Link href="/tac-gia/bang-dieu-khien" className="text-sm text-primary hover:underline">← Bảng điều khiển</Link>
                        <div className="flex items-center justify-between gap-3 mt-2">
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <Package className="w-6 h-6 text-primary" />
                                Vật phẩm: {(story as any)?.title || 'Truyện'}
                            </h1>
                            <button
                                type="button"
                                onClick={() => setCreating(true)}
                                disabled={!storyId}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-medium disabled:opacity-50"
                            >
                                <Plus className="w-4 h-4" /> Thêm vật phẩm
                            </button>
                        </div>
                        <p className="text-sm text-on-surface-variant mt-1">
                            Người đọc mua vật phẩm bằng xu; doanh thu về ví của bạn (đã trừ phí nền tảng).
                        </p>
                    </div>

                    {storyLoading || isLoading ? (
                        <div className="py-16"><Loading /></div>
                    ) : !items || items.length === 0 ? (
                        <div className="bg-surface-container rounded-xl p-10 text-center text-on-surface-variant">
                            Chưa có vật phẩm nào. Bấm &quot;Thêm vật phẩm&quot; để tạo.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map((it) => (
                                <div key={it.id} className={`bg-surface-container rounded-xl p-3 flex gap-3 items-center border border-outline-variant ${!it.isActive ? 'opacity-60' : ''}`}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={it.imageUrl} alt={it.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold truncate">{it.name}</p>
                                            {!it.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-surface-variant text-on-surface-variant">Ngừng bán</span>}
                                            {it.fileUrl && <FileText className="w-4 h-4 text-on-surface-variant" aria-label="Có file" />}
                                        </div>
                                        <p className="text-sm text-on-surface-variant">
                                            {it.price.toLocaleString('vi-VN')} xu · Đã bán {it.soldQuantity} · Thu {it.revenue.toLocaleString('vi-VN')} xu
                                            {it.stock !== null && ` · Tồn kho ${it.remaining}/${it.stock}`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button type="button" onClick={() => setEditing(it)} className="p-2 rounded-lg border border-outline-variant hover:bg-surface-container-high" aria-label="Sửa"><Pencil className="w-4 h-4" /></button>
                                        <button type="button" onClick={() => setDeleteTarget(it)} className="p-2 rounded-lg border border-error/40 text-error hover:bg-error/10" aria-label="Xoá"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {(creating || editing) && storyId && (
                <ItemFormModal
                    storyId={storyId}
                    item={editing}
                    onClose={() => { setCreating(false); setEditing(null); }}
                />
            )}

            <ConfirmModal
                isOpen={!!deleteTarget}
                title="Xoá vật phẩm?"
                message={`Xoá "${deleteTarget?.name}"? Nếu đã có người mua, vật phẩm chỉ bị ngừng bán để giữ lịch sử.`}
                confirmText="Xoá"
                onConfirm={doDelete}
                onClose={() => setDeleteTarget(null)}
            />

        </div>
    );
}

function ItemFormModal({ storyId, item, onClose }: { storyId: string; item: StoryItemManage | null; onClose: () => void }) {
    const { showToast } = useToastContext();
    const createMutation = useCreateStoryItem(storyId);
    const updateMutation = useUpdateStoryItem(storyId);
    const imgInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [name, setName] = useState(item?.name || '');
    const [description, setDescription] = useState(item?.description || '');
    const [imageUrl, setImageUrl] = useState(item?.imageUrl || '');
    const [fileUrl, setFileUrl] = useState(item?.fileUrl || '');
    const [fileName, setFileName] = useState(item?.fileUrl ? 'File đã tải lên' : '');
    const [price, setPrice] = useState(String(item?.price ?? ''));
    const [limitStock, setLimitStock] = useState(item ? item.stock !== null : false);
    const [stock, setStock] = useState(item?.stock != null ? String(item.stock) : '');
    const [isActive, setIsActive] = useState(item?.isActive ?? true);
    const [uploadingImg, setUploadingImg] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);

    const busy = createMutation.isPending || updateMutation.isPending;

    const onImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (e.target) e.target.value = ''; if (!f) return;
        setUploadingImg(true);
        try { setImageUrl(await storyItemsService.uploadImage(f)); } catch (err: any) { showToast(err?.response?.data?.error || 'Tải ảnh lỗi', 'error'); } finally { setUploadingImg(false); }
    };
    const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (e.target) e.target.value = ''; if (!f) return;
        setUploadingFile(true);
        try { const r = await storyItemsService.uploadFile(f); setFileUrl(r.url); setFileName(r.name); } catch (err: any) { showToast(err?.response?.data?.error || 'Tải file lỗi', 'error'); } finally { setUploadingFile(false); }
    };

    const submit = async () => {
        const priceNum = parseInt(price, 10);
        if (!name.trim()) return showToast('Nhập tên vật phẩm', 'error');
        if (!imageUrl) return showToast('Tải ảnh vật phẩm', 'error');
        if (!Number.isInteger(priceNum) || priceNum < 1) return showToast('Giá không hợp lệ', 'error');
        const stockNum = limitStock ? parseInt(stock, 10) : null;
        if (limitStock && (!Number.isInteger(stockNum!) || stockNum! < 0)) return showToast('Tồn kho không hợp lệ', 'error');

        const dto: UpsertStoryItem = {
            name: name.trim(),
            description: description.trim() || undefined,
            imageUrl,
            fileUrl: fileUrl || undefined,
            price: priceNum,
            stock: stockNum,
            isActive,
        };
        try {
            if (item) await updateMutation.mutateAsync({ id: item.id, dto });
            else await createMutation.mutateAsync(dto);
            showToast(item ? 'Đã cập nhật' : 'Đã thêm vật phẩm', 'success');
            onClose();
        } catch (e: any) {
            showToast(e?.response?.data?.error || 'Lưu thất bại', 'error');
        }
    };

    const input = 'w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 overflow-y-auto" onClick={onClose}>
            <div className="bg-surface-container rounded-2xl w-full max-w-lg p-5 shadow-xl my-8" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-lg font-bold">{item ? 'Sửa vật phẩm' : 'Thêm vật phẩm'}</h3>
                    <button type="button" onClick={onClose} className="text-on-surface-variant hover:text-on-surface"><X className="w-5 h-5" /></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-on-surface-variant mb-2">Ảnh vật phẩm *</label>
                        <div className="flex items-center gap-3">
                            {imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={imageUrl} alt="" className="w-20 h-20 rounded-lg object-cover border border-outline-variant" />
                            ) : (
                                <div className="w-20 h-20 rounded-lg bg-surface-variant flex items-center justify-center text-on-surface-variant"><Package className="w-8 h-8" /></div>
                            )}
                            <input ref={imgInputRef} type="file" accept="image/*,.heic,.heif" onChange={onImg} className="hidden" />
                            <button type="button" onClick={() => imgInputRef.current?.click()} disabled={uploadingImg} className="px-3 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-high text-sm inline-flex items-center gap-2 disabled:opacity-50">
                                {uploadingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {imageUrl ? 'Đổi ảnh' : 'Tải ảnh'}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-on-surface-variant mb-2">Tên *</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} className={input} placeholder="Vd: Ngoại truyện đặc biệt" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-on-surface-variant mb-2">Mô tả</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={input} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">Giá (xu) *</label>
                            <input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} className={input} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">Trạng thái</label>
                            <label className="flex items-center gap-2 mt-2.5">
                                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 text-primary rounded" />
                                <span className="text-sm">Đang bán</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center gap-2 mb-2">
                            <input type="checkbox" checked={limitStock} onChange={(e) => setLimitStock(e.target.checked)} className="w-4 h-4 text-primary rounded" />
                            <span className="text-sm font-medium text-on-surface-variant">Giới hạn số lượng (tồn kho)</span>
                        </label>
                        {limitStock && (
                            <input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} className={input} placeholder="Số lượng tối đa" />
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-on-surface-variant mb-2">File tải về (tuỳ chọn)</label>
                        <input ref={fileInputRef} type="file" onChange={onFile} className="hidden" />
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} className="px-3 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-high text-sm inline-flex items-center gap-2 disabled:opacity-50">
                                {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} {fileUrl ? 'Đổi file' : 'Tải file'}
                            </button>
                            {fileUrl && (
                                <span className="text-sm text-on-surface-variant inline-flex items-center gap-1.5 min-w-0">
                                    <FileText className="w-4 h-4 flex-shrink-0" /> <span className="truncate">{fileName || 'file'}</span>
                                    <button type="button" onClick={() => { setFileUrl(''); setFileName(''); }} className="text-error"><X className="w-4 h-4" /></button>
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-on-surface-variant mt-1">PDF, ảnh, zip, epub… tối đa 50MB. Chỉ người đã mua tải được.</p>
                    </div>

                    <button type="button" onClick={submit} disabled={busy || uploadingImg || uploadingFile} className="w-full px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2">
                        {busy && <Loader2 className="w-4 h-4 animate-spin" />} {item ? 'Lưu' : 'Thêm vật phẩm'}
                    </button>
                </div>
            </div>
        </div>
    );
}
