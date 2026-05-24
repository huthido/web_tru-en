'use client';

import { useMemo, useCallback, useRef, useState, useEffect, createElement } from 'react';
import dynamic from 'next/dynamic';
import { compressImage } from '@/lib/utils/compress-image';
import 'react-quill/dist/quill.snow.css';

// Dynamically import ReactQuill to avoid SSR issues
const DynamicReactQuill = dynamic(() => import('react-quill'), { ssr: false }) as any;

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    uploadEndpoint?: string;
    uploadFolder?: string;
    listImagesEndpoint?: string;
}

interface UserImage {
    id: string;
    url: string;
    filename: string;
    folder: string;
    size: number;
    createdAt: string;
}

export function RichTextEditor({ value, onChange, placeholder, className, uploadEndpoint = '/api/pages/upload-image', uploadFolder = 'pages', listImagesEndpoint }: RichTextEditorProps) {
    const quillRef = useRef<any>(null);
    const [showGallery, setShowGallery] = useState(false);
    const [galleryImages, setGalleryImages] = useState<UserImage[]>([]);
    const [galleryLoading, setGalleryLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Image resize & align state
    const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
    const [resizeToolbar, setResizeToolbar] = useState<{ top: number; left: number } | null>(null);
    const [imageAlign, setImageAlign] = useState<'left' | 'center' | 'right' | ''>('');
    const [customWidth, setCustomWidth] = useState('');

    // Use refs for values that change frequently to avoid recreating modules
    const valueRef = useRef(value);
    const onChangeRef = useRef(onChange);
    valueRef.current = value;
    onChangeRef.current = onChange;

    const getQuillInstance = useCallback(() => {
        if (quillRef.current) {
            const editor = quillRef.current.getEditor?.();
            if (editor) return editor;
        }
        // Fallback: find from DOM
        const quillContainer = document.querySelector('.quill');
        if (quillContainer) {
            return (quillContainer as any).__quill || (window as any).Quill?.find(quillContainer);
        }
        return null;
    }, []);

    const insertImageToEditor = useCallback((imageUrl: string) => {
        const quill = getQuillInstance();
        if (quill) {
            try {
                // Focus the editor first (modal may have stolen focus)
                quill.focus();
                const range = quill.getSelection();
                const index = range ? range.index : quill.getLength() - 1;
                quill.insertEmbed(index, 'image', imageUrl);
                quill.setSelection(index + 1);
                return;
            } catch (err) {
                console.error('Error inserting image via Quill API:', err);
            }
        }
        // Fallback: insert as HTML
        console.log('Using HTML fallback to insert image');
        const currentContent = valueRef.current || '';
        const imgTag = `<p><img src="${imageUrl}" style="max-width: 100%;" /></p>`;
        onChangeRef.current(currentContent + imgTag);
    }, [getQuillInstance]);

    // Stable image handler that doesn't depend on value/onChange  
    const imageHandler = useCallback(async () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const originalFile = input.files?.[0];
            if (!originalFile) return;

            if (!originalFile.type.startsWith('image/')) {
                alert('Vui lòng chọn file ảnh');
                return;
            }

            if (originalFile.size > 10 * 1024 * 1024) {
                alert('Kích thước ảnh gốc không được vượt quá 10MB');
                return;
            }

            try {
                // Compress image before upload (backend re-encodes thành WebP q80)
                const file = await compressImage(originalFile, {
                    maxWidth: 1600,
                    maxHeight: 1600,
                    quality: 0.9,
                });

                const formData = new FormData();
                formData.append('file', file);
                formData.append('folder', uploadFolder);

                const apiUrl = process.env.NODE_ENV === 'development' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') : '';
                const response = await fetch(`${apiUrl}${uploadEndpoint}`, {
                    method: 'POST',
                    credentials: 'include',
                    body: formData,
                });

                if (!response.ok) {
                    let serverMessage = '';
                    try {
                        const errBody = await response.json();
                        serverMessage = errBody?.message || errBody?.error?.message || errBody?.data?.message || '';
                    } catch {
                        // ignore parse error
                    }
                    throw new Error(serverMessage || `Upload thất bại (HTTP ${response.status})`);
                }

                const data = await response.json();
                const imageUrl = data.data?.url || data.url;

                if (!imageUrl) {
                    throw new Error('Máy chủ không trả về địa chỉ ảnh.');
                }

                insertImageToEditor(imageUrl);
            } catch (error: any) {
                console.error('Error uploading image:', error);
                const msg = error?.message || 'Có lỗi xảy ra khi upload ảnh. Vui lòng thử lại.';
                alert(msg);
            }
        };
    }, [uploadEndpoint, uploadFolder, insertImageToEditor]);

    // Modules must be stable — never depend on value/onChange
    const modules = useMemo(
        () => ({
            toolbar: {
                container: [
                    [{ header: [1, 2, 3, 4, 5, 6, false] }],
                    [{ font: [] }],
                    [{ size: [] }],
                    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                    [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
                    [{ color: [] }, { background: [] }],
                    [{ align: [] }],
                    ['link', 'image', 'video'],
                    ['clean'],
                ],
                handlers: {
                    image: imageHandler,
                },
            },
            clipboard: {
                matchVisual: false,
            },
        }),
        [imageHandler]
    );

    const formats = useMemo(() => [
        'header',
        'font',
        'size',
        'bold',
        'italic',
        'underline',
        'strike',
        'blockquote',
        'list',
        'bullet',
        'indent',
        'color',
        'background',
        'align',
        'link',
        'image',
        'video',
        'width',
        'height',
        'style',
    ], []);

    // --- Image Resize & Align Logic ---
    const triggerQuillUpdate = useCallback(() => {
        const quill = getQuillInstance();
        if (quill) {
            const html = quill.root.innerHTML;
            onChangeRef.current(html);
        }
    }, [getQuillInstance]);

    const updateImageSize = useCallback((img: HTMLImageElement, widthPercent: number | string) => {
        if (typeof widthPercent === 'number') {
            img.style.width = `${widthPercent}%`;
            img.removeAttribute('width');
            img.removeAttribute('height');
            img.style.height = 'auto';
            setCustomWidth(String(widthPercent));
        } else {
            img.style.width = widthPercent;
            img.style.height = 'auto';
            setCustomWidth(widthPercent.replace('%', '').replace('px', ''));
        }
        triggerQuillUpdate();
    }, [triggerQuillUpdate]);

    const updateImageAlign = useCallback((img: HTMLImageElement, align: 'left' | 'center' | 'right' | '') => {
        // Reset all alignment styles
        img.style.display = '';
        img.style.marginLeft = '';
        img.style.marginRight = '';
        img.style.cssFloat = '';

        if (align === 'left') {
            img.style.cssFloat = 'left';
            img.style.marginRight = '12px';
            img.style.marginBottom = '8px';
        } else if (align === 'center') {
            img.style.display = 'block';
            img.style.marginLeft = 'auto';
            img.style.marginRight = 'auto';
        } else if (align === 'right') {
            img.style.cssFloat = 'right';
            img.style.marginLeft = '12px';
            img.style.marginBottom = '8px';
        }

        setImageAlign(align);
        triggerQuillUpdate();
    }, [triggerQuillUpdate]);

    const getImageAlign = useCallback((img: HTMLImageElement): 'left' | 'center' | 'right' | '' => {
        if (img.style.cssFloat === 'left') return 'left';
        if (img.style.cssFloat === 'right') return 'right';
        if (img.style.marginLeft === 'auto' && img.style.marginRight === 'auto') return 'center';
        return '';
    }, []);

    const positionToolbar = useCallback((img: HTMLImageElement) => {
        const editorEl = document.querySelector('.ql-editor');
        if (!editorEl) return;
        const editorRect = editorEl.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();
        const scrollTop = editorEl.scrollTop;

        setResizeToolbar({
            top: imgRect.top - editorRect.top + scrollTop - 44,
            left: imgRect.left - editorRect.left + imgRect.width / 2,
        });
    }, []);

    // Click handler for images in the editor
    // Must poll for .ql-editor since ReactQuill is dynamically imported
    const justClickedImageRef = useRef(false);

    useEffect(() => {
        let editorEl: Element | null = null;
        let pollTimer: ReturnType<typeof setInterval> | null = null;

        const handleImageClick = (e: Event) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'IMG' && editorEl) {
                e.preventDefault();
                const img = target as HTMLImageElement;

                // Mark that we just clicked an image (prevents outsideClick from clearing)
                justClickedImageRef.current = true;
                setTimeout(() => { justClickedImageRef.current = false; }, 50);

                // Deselect previous
                editorEl.querySelectorAll('img.ql-selected').forEach(el => el.classList.remove('ql-selected'));
                img.classList.add('ql-selected');
                setSelectedImage(img);
                setCustomWidth(img.style.width?.replace('%', '').replace('px', '') || '100');
                setImageAlign(getImageAlign(img));
                positionToolbar(img);
            }
        };

        const handleClickOutside = (e: Event) => {
            // Skip if we just clicked an image (race condition prevention)
            if (justClickedImageRef.current) return;

            const target = e.target as HTMLElement;
            // Don't deselect if clicking the toolbar or its children
            if (target.closest('.image-resize-toolbar')) return;
            // Don't deselect if clicking an image inside the editor
            if (target.tagName === 'IMG' && target.closest('.ql-editor')) return;

            if (editorEl) {
                editorEl.querySelectorAll('img.ql-selected').forEach(el => el.classList.remove('ql-selected'));
            }
            setSelectedImage(null);
            setResizeToolbar(null);
        };

        const attach = () => {
            editorEl = document.querySelector('.ql-editor');
            if (editorEl) {
                if (pollTimer) clearInterval(pollTimer);
                editorEl.addEventListener('click', handleImageClick);
                document.addEventListener('click', handleClickOutside);
            }
        };

        // Poll until .ql-editor exists (dynamic import delay)
        attach();
        if (!editorEl) {
            pollTimer = setInterval(attach, 500);
        }

        return () => {
            if (pollTimer) clearInterval(pollTimer);
            if (editorEl) {
                editorEl.removeEventListener('click', handleImageClick);
            }
            document.removeEventListener('click', handleClickOutside);
        };
    }, [positionToolbar]);

    const loadGalleryImages = useCallback(async () => {
        if (!listImagesEndpoint) return;
        setGalleryLoading(true);
        try {
            const apiUrl = process.env.NODE_ENV === 'development' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') : '';
            const response = await fetch(`${apiUrl}${listImagesEndpoint}`, {
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setGalleryImages(data.data || []);
            }
        } catch (err) {
            console.error('Failed to load gallery:', err);
        } finally {
            setGalleryLoading(false);
        }
    }, [listImagesEndpoint]);

    const handleDeleteImage = useCallback(async (imageId: string) => {
        if (!confirm('Xoá ảnh này khỏi thư viện?')) return;
        setDeletingId(imageId);
        try {
            const apiUrl = process.env.NODE_ENV === 'development' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') : '';
            const response = await fetch(`${apiUrl}/api/chapters/images/${imageId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (response.ok) {
                setGalleryImages(prev => prev.filter(img => img.id !== imageId));
            }
        } catch (err) {
            console.error('Failed to delete image:', err);
        } finally {
            setDeletingId(null);
        }
    }, []);

    const handleSelectGalleryImage = useCallback((imageUrl: string) => {
        insertImageToEditor(imageUrl);
        setShowGallery(false);
    }, [insertImageToEditor]);

    const openGallery = useCallback(() => {
        setShowGallery(true);
        loadGalleryImages();
    }, [loadGalleryImages]);

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className={className}>
            {/* Gallery Button */}
            {listImagesEndpoint && (
                <div className="mb-2 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={openGallery}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant hover:bg-surface-container-low transition-colors"
                    >
                        📁 Ảnh đã tải ({galleryImages.length > 0 ? galleryImages.length : '...'})
                    </button>
                </div>
            )}

            <div className="relative">
                {/* Use createElement to completely bypass JSX type checking for the ref prop */}
                {createElement(DynamicReactQuill, {
                    ref: quillRef,
                    theme: "snow",
                    value: value,
                    onChange: onChange,
                    modules: modules,
                    formats: formats,
                    placeholder: placeholder || 'Nhập nội dung...',
                    className: "bg-surface-container"
                } as any)}

                {/* Image Resize Toolbar */}
                {selectedImage && resizeToolbar && (
                    <div
                        className="image-resize-toolbar"
                        style={{
                            position: 'absolute',
                            top: `${resizeToolbar.top}px`,
                            left: `${resizeToolbar.left}px`,
                            transform: 'translateX(-50%)',
                            zIndex: 100,
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-1 px-2 py-1.5 bg-surface-container rounded-lg shadow-lg border border-outline-variant text-xs">
                            {[25, 50, 75, 100].map(size => (
                                <button
                                    key={size}
                                    type="button"
                                    onClick={() => updateImageSize(selectedImage, size)}
                                    className={`px-2 py-1 rounded font-medium transition-colors ${customWidth === String(size)
                                        ? 'bg-primary text-on-primary'
                                        : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                                        }`}
                                >
                                    {size}%
                                </button>
                            ))}
                            <span className="mx-1 text-on-surface-variant">|</span>
                            <input
                                type="number"
                                value={customWidth}
                                onChange={(e) => setCustomWidth(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = parseInt(customWidth);
                                        if (val > 0 && val <= 100) {
                                            updateImageSize(selectedImage, val);
                                        }
                                    }
                                }}
                                onBlur={() => {
                                    const val = parseInt(customWidth);
                                    if (val > 0 && val <= 100) {
                                        updateImageSize(selectedImage, val);
                                    }
                                }}
                                className="w-12 px-1 py-1 text-center border border-outline-variant rounded bg-surface-container text-on-surface-variant"
                                min="10"
                                max="100"
                            />
                            <span className="text-on-surface-variant">%</span>
                            <span className="mx-1 text-on-surface-variant">|</span>
                            {[
                                { align: 'left' as const, icon: '⬅', title: 'Canh trái' },
                                { align: 'center' as const, icon: '↔', title: 'Canh giữa' },
                                { align: 'right' as const, icon: '➡', title: 'Canh phải' },
                            ].map(({ align, icon, title }) => (
                                <button
                                    key={align}
                                    type="button"
                                    title={title}
                                    onClick={() => updateImageAlign(selectedImage, imageAlign === align ? '' : align)}
                                    className={`px-2 py-1 rounded font-medium transition-colors ${imageAlign === align
                                        ? 'bg-primary text-on-primary'
                                        : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                                        }`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Gallery Modal */}
            {showGallery && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowGallery(false)}>
                    <div
                        className="bg-surface-container rounded-xl shadow-2xl w-[90vw] max-w-3xl max-h-[80vh] flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
                            <h3 className="text-lg font-semibold text-on-surface">
                                📁 Thư viện ảnh của bạn
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowGallery(false)}
                                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface-variant hover:bg-surface-container-high transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {galleryLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                    <span className="ml-3 text-on-surface-variant">Đang tải...</span>
                                </div>
                            ) : galleryImages.length === 0 ? (
                                <div className="text-center py-12 text-on-surface-variant">
                                    <div className="text-4xl mb-3">🖼️</div>
                                    <p className="font-medium">Chưa có ảnh nào</p>
                                    <p className="text-sm mt-1">Ảnh sẽ xuất hiện ở đây sau khi bạn upload</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {galleryImages.map((image) => (
                                        <div
                                            key={image.id}
                                            className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 cursor-pointer transition-all bg-surface-container-high"
                                            onClick={() => handleSelectGalleryImage(image.url)}
                                        >
                                            <img
                                                src={image.url}
                                                alt={image.filename}
                                                className="w-full h-full object-cover pointer-events-none"
                                                loading="lazy"
                                            />
                                            {/* Overlay */}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-end pointer-events-none">
                                                <div className="w-full p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100">
                                                    <p className="text-white text-xs truncate">{image.filename}</p>
                                                    <p className="text-white/70 text-xs">{formatFileSize(image.size)}</p>
                                                </div>
                                            </div>
                                            {/* Delete button */}
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteImage(image.id);
                                                }}
                                                disabled={deletingId === image.id}
                                                className="absolute top-1 right-1 p-1 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all text-xs z-10"
                                                title="Xoá ảnh"
                                            >
                                                {deletingId === image.id ? '⏳' : '🗑'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-3 border-t border-outline-variant text-xs text-on-surface-variant flex items-center justify-between">
                            <span>Click vào ảnh để chèn vào nội dung</span>
                            <span>{galleryImages.length} ảnh</span>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .quill {
                    background: white;
                }
                .dark .quill {
                    background: #1f2937;
                }
                .quill .ql-container {
                    min-height: 300px;
                    height: auto;
                    font-size: 16px;
                }
                .quill .ql-editor {
                    min-height: 300px;
                    height: auto;
                    color: #111827;
                }
                .dark .quill .ql-editor {
                    color: #f3f4f6;
                }
                .quill .ql-toolbar {
                    border-top-left-radius: 0.5rem;
                    border-top-right-radius: 0.5rem;
                    border-bottom: 1px solid #e5e7eb;
                }
                .dark .quill .ql-toolbar {
                    border-bottom-color: #374151;
                    background: #374151;
                }
                .quill .ql-container {
                    border-bottom-left-radius: 0.5rem;
                    border-bottom-right-radius: 0.5rem;
                    border: 1px solid #e5e7eb;
                }
                .dark .quill .ql-container {
                    border-color: #374151;
                }
                .quill .ql-stroke {
                    stroke: #6b7280;
                }
                .dark .quill .ql-stroke {
                    stroke: #9ca3af;
                }
                .quill .ql-fill {
                    fill: #6b7280;
                }
                .dark .quill .ql-fill {
                    fill: #9ca3af;
                }
                .quill .ql-picker-label {
                    color: #6b7280;
                }
                .dark .quill .ql-picker-label {
                    color: #9ca3af;
                }
                /* Image resize selection */
                .ql-editor img {
                    cursor: pointer;
                    transition: outline 0.15s;
                }
                .ql-editor img.ql-selected {
                    outline: 3px solid #3b82f6;
                    outline-offset: 2px;
                    border-radius: 2px;
                }
                .ql-editor img:hover:not(.ql-selected) {
                    outline: 2px dashed #93c5fd;
                    outline-offset: 2px;
                }
            `}</style>
        </div>
    );
}
