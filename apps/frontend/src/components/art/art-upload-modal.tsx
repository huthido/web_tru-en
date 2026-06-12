'use client';

import { useState, useRef, useCallback } from 'react';
import { X, Upload, ImagePlus } from 'lucide-react';
import { useUploadArtImage, useCreateArtPost } from '@/lib/api/hooks/use-art';

interface Props {
  onClose: () => void;
}

export function ArtUploadModal({ onClose }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const { mutateAsync: uploadImage, isPending: isUploading } = useUploadArtImage();
  const { mutateAsync: createPost, isPending: isCreating } = useCreateArtPost();

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    const img = new window.Image();
    img.onload = () => setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const result = await uploadImage(file);
    const { url } = result as { url: string };
    await createPost({
      imageUrl: url,
      caption: caption.trim() || undefined,
      width: imgDims?.w,
      height: imgDims?.h,
    });
    onClose();
  };

  const busy = isUploading || isCreating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full max-w-md bg-surface rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
          <h2 className="font-semibold text-on-surface">Đăng ảnh nghệ thuật</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-surface-variant">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Drop zone / Preview */}
          {preview ? (
            <div className="relative rounded-xl overflow-hidden bg-surface-container">
              <img src={preview} alt="preview" className="w-full max-h-72 object-contain" />
              <button
                type="button"
                onClick={() => { setPreview(null); setFile(null); setImgDims(null); }}
                className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              ref={dropRef}
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

          {/* Caption */}
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Viết mô tả... (tuỳ chọn)"
            rows={3}
            maxLength={500}
            className="w-full bg-surface-container rounded-xl px-4 py-3 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary resize-none"
          />
          <div className="text-right text-xs text-on-surface-variant">{caption.length}/500</div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!file || busy}
            className="w-full py-2.5 rounded-xl bg-on-surface text-surface font-semibold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <span className="w-4 h-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
                {isUploading ? 'Đang tải ảnh...' : 'Đang đăng...'}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Đăng bài
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
