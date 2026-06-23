'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Upload, ImagePlus } from 'lucide-react';
import { useUploadPaintingImage, useCreatePainting } from '@/lib/api/hooks/use-paintings';

interface Props {
  onClose: () => void;
}

export function PaintingUploadModal({ onClose }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [phone, setPhone] = useState('');
  const [zalo, setZalo] = useState('');
  const [facebook, setFacebook] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: uploadImage, isPending: isUploading } = useUploadPaintingImage();
  const { mutateAsync: create, isPending: isCreating } = useCreatePainting();

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;

    const { url } = await uploadImage(file);

    const contactInfo = {
      ...(phone.trim() && { phone: phone.trim() }),
      ...(zalo.trim() && { zalo: zalo.trim() }),
      ...(facebook.trim() && { facebook: facebook.trim() }),
    };

    await create({
      title: title.trim(),
      description: description.trim() || undefined,
      imageUrl: url,
      price: price ? parseInt(price.replace(/\D/g, ''), 10) : undefined,
      contactInfo: Object.keys(contactInfo).length > 0 ? contactInfo : undefined,
    });

    onClose();
  };

  const busy = isUploading || isCreating;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full sm:max-w-lg bg-surface rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20 flex-shrink-0">
          <h2 className="font-semibold text-on-surface">Đăng tranh</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-surface-variant">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          {/* Drop zone / Preview */}
          {preview ? (
            <div className="relative rounded-xl overflow-hidden bg-surface-container">
              <img src={preview} alt="preview" className="w-full max-h-64 object-contain" />
              <button
                type="button"
                onClick={() => { setPreview(null); setFile(null); }}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-outline-variant rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary hover:bg-surface-container transition-colors"
            >
              <ImagePlus className="w-10 h-10 text-on-surface-variant" />
              <p className="text-sm text-on-surface-variant text-center">
                Kéo thả ảnh vào đây hoặc <span className="text-primary font-medium">chọn file</span>
              </p>
              <p className="text-xs text-on-surface-variant/60">PNG, JPG, WEBP — tối đa 10MB</p>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {/* Tiêu đề */}
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Tiêu đề *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tên tác phẩm..."
              maxLength={200}
              required
              className="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả tác phẩm... (tuỳ chọn)"
              rows={2}
              maxLength={2000}
              className="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* Giá */}
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Giá (VNĐ)</label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Để trống = Thương lượng"
              className="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Liên hệ */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-on-surface-variant">Thông tin liên hệ</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Số điện thoại"
              className="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              value={zalo}
              onChange={(e) => setZalo(e.target.value)}
              placeholder="Zalo (số hoặc link)"
              className="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="Facebook (link profile)"
              className="w-full bg-surface-container rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!file || !title.trim() || busy}
            className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                {isUploading ? 'Đang tải ảnh...' : 'Đang đăng...'}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Đăng tranh
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
