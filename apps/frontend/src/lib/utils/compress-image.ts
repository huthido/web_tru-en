/**
 * Client-side image compression utility using Canvas API.
 * Compresses images before upload to reduce bandwidth and storage.
 *
 * Backend (ImageNormalizePipe) sẽ re-encode về WebP q80 sau cùng — đây chỉ là
 * pre-compress để tiết kiệm băng thông. Default quality 0.9 (gần lossless) để
 * giảm artifact double-compress.
 */

export interface CompressOptions {
    /** Max width in pixels (default: 1920) */
    maxWidth?: number;
    /** Max height in pixels (default: 1920) */
    maxHeight?: number;
    /** JPEG/WebP quality 0-1 (default: 0.9 — gần lossless, backend sẽ re-encode q80) */
    quality?: number;
    /** Output MIME type. 'auto' = WebP nếu trình duyệt support, fallback JPEG. */
    outputType?: 'auto' | 'image/jpeg' | 'image/webp' | 'image/png';
    /** Max file size in bytes — if original is smaller, skip compression. Default 0 (luôn compress). */
    skipIfSmallerThan?: number;
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.9,
    outputType: 'auto',
    skipIfSmallerThan: 0,
};

let cachedWebpSupport: boolean | null = null;

function supportsWebpEncode(): boolean {
    if (cachedWebpSupport !== null) return cachedWebpSupport;
    if (typeof document === 'undefined') return (cachedWebpSupport = false);
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        cachedWebpSupport = canvas.toDataURL('image/webp').startsWith('data:image/webp');
    } catch {
        cachedWebpSupport = false;
    }
    return cachedWebpSupport;
}

function resolveOutputType(option: CompressOptions['outputType']): 'image/jpeg' | 'image/webp' | 'image/png' {
    if (option === 'auto' || option === undefined) {
        return supportsWebpEncode() ? 'image/webp' : 'image/jpeg';
    }
    return option;
}

async function drawToBlob(
    bitmap: ImageBitmap,
    width: number,
    height: number,
    outputType: 'image/jpeg' | 'image/webp' | 'image/png',
    quality: number,
): Promise<Blob | null> {
    // Prefer OffscreenCanvas khi có (modern Chrome/Firefox); fallback HTMLCanvas
    // cho Safari < 16.4 và webview cũ.
    if (typeof OffscreenCanvas !== 'undefined') {
        try {
            const canvas = new OffscreenCanvas(width, height);
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;
            ctx.drawImage(bitmap, 0, 0, width, height);
            return await canvas.convertToBlob({ type: outputType, quality });
        } catch (err) {
            console.warn('[compress] OffscreenCanvas failed, falling back to HTMLCanvas:', err);
        }
    }

    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    return await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), outputType, quality),
    );
}

/**
 * Compress an image file using Canvas API.
 * Returns the compressed file (or original if smaller / unsupported).
 */
export async function compressImage(
    file: File,
    options: CompressOptions = {}
): Promise<File> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    const name = (file.name || '').toLowerCase();
    const isHeic =
        file.type === 'image/heic' ||
        file.type === 'image/heif' ||
        name.endsWith('.heic') ||
        name.endsWith('.heif');

    // HEIC/HEIF: chỉ Safari iOS 16+ decode native qua createImageBitmap. Trình
    // duyệt khác throw → upload raw cho backend (libheif đã cài trong Docker).
    // Detect sớm để khỏi tốn attempt loop ở compressImageToTarget.
    if (isHeic) {
        try {
            await createImageBitmap(file);
        } catch {
            console.log('[compress] HEIC detected, browser cannot decode — uploading raw for backend');
            return file;
        }
    }

    if (!file.type.startsWith('image/') && !isHeic) {
        return file;
    }

    // GIF: animation sẽ bị mất nếu vẽ qua canvas — backend sẽ passthrough.
    if (file.type === 'image/gif') {
        return file;
    }

    // SVG: vector, không vẽ canvas — backend passthrough.
    if (file.type === 'image/svg+xml') {
        return file;
    }

    if (opts.skipIfSmallerThan > 0 && file.size <= opts.skipIfSmallerThan) {
        return file;
    }

    try {
        const bitmap = await createImageBitmap(file);
        const { width, height } = calculateDimensions(
            bitmap.width,
            bitmap.height,
            opts.maxWidth,
            opts.maxHeight
        );

        const outputType = resolveOutputType(opts.outputType);
        const blob = await drawToBlob(bitmap, width, height, outputType, opts.quality);
        bitmap.close();

        if (!blob) {
            console.warn('[compress] Canvas blob generation failed, returning original');
            return file;
        }

        const ext = outputType === 'image/webp' ? '.webp'
            : outputType === 'image/png' ? '.png'
                : '.jpg';
        const baseName = file.name.replace(/\.[^.]+$/, '');
        const newName = baseName + ext;

        const compressed = new File([blob], newName, { type: outputType });

        if (compressed.size >= file.size) {
            console.log(`[compress] Compressed >= original (${formatSize(compressed.size)} vs ${formatSize(file.size)}), using original`);
            return file;
        }

        const ratio = ((1 - compressed.size / file.size) * 100).toFixed(0);
        console.log(
            `[compress] ${file.name}: ${formatSize(file.size)} → ${formatSize(compressed.size)} (-${ratio}%) [${outputType}]`
        );

        return compressed;
    } catch (err) {
        console.warn('[compress] Failed, returning original:', err);
        return file;
    }
}

function calculateDimensions(
    srcW: number,
    srcH: number,
    maxW: number,
    maxH: number
): { width: number; height: number } {
    if (srcW <= maxW && srcH <= maxH) {
        return { width: srcW, height: srcH };
    }

    const ratio = Math.min(maxW / srcW, maxH / srcH);
    return {
        width: Math.round(srcW * ratio),
        height: Math.round(srcH * ratio),
    };
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Nén lặp đi lặp lại cho đến khi đạt `targetBytes` hoặc hết `maxAttempts`.
 * Mỗi vòng giảm quality, vòng cuối còn giảm maxWidth, cho phép user pick ảnh
 * gốc lớn (tới 50MB) mà output upload vẫn ≤ target. Nếu vòng cuối vẫn vượt
 * target, trả best-effort + log warning để caller quyết hành xử.
 */
export async function compressImageToTarget(
    file: File,
    baseOptions: CompressOptions,
    targetBytes: number,
    maxAttempts: number = 4,
): Promise<File> {
    // GIF/SVG không qua canvas; nếu file đã ≤ target → return luôn.
    if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
    if (file.size <= targetBytes) {
        const compressed = await compressImage(file, baseOptions);
        if (compressed.size <= targetBytes) return compressed;
    }

    const baseQuality = baseOptions.quality ?? 0.9;
    const baseMaxWidth = baseOptions.maxWidth ?? 1920;
    const baseMaxHeight = baseOptions.maxHeight ?? 1920;

    let best: File = file;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Vòng 0 dùng baseOptions; mỗi vòng sau giảm quality 0.15. Vòng cuối còn
        // co maxWidth/maxHeight thêm 30% để ép kích thước xuống.
        const quality = Math.max(0.4, baseQuality - attempt * 0.15);
        const dimensionShrink = attempt >= maxAttempts - 1 ? 0.7 : 1;
        const trial = await compressImage(file, {
            ...baseOptions,
            quality,
            maxWidth: Math.round(baseMaxWidth * dimensionShrink),
            maxHeight: Math.round(baseMaxHeight * dimensionShrink),
            skipIfSmallerThan: 0,
        });
        if (trial.size < best.size) best = trial;
        if (trial.size <= targetBytes) {
            console.log(
                `[compress-to-target] reached ${formatSize(trial.size)} ≤ ${formatSize(targetBytes)} ` +
                `(attempt ${attempt + 1}, q=${quality.toFixed(2)})`,
            );
            return trial;
        }
        // Early-break: compressImage trả về file gốc tức là canvas decode fail
        // (vd HEIC trên Chrome). Loop tiếp cũng vô ích — upload raw cho backend.
        if (trial === file) {
            console.log('[compress-to-target] client decode fail — upload raw for backend');
            return file;
        }
    }

    console.warn(
        `[compress-to-target] không đạt target sau ${maxAttempts} lần — best=${formatSize(best.size)} ` +
        `target=${formatSize(targetBytes)}. Trả best-effort.`,
    );
    return best;
}

/** Quy ước target size cho từng loại ảnh — dùng chung mọi form upload. */
export const COMPRESS_TARGET = {
    avatar: 500 * 1024,           // 500KB
    cover: 2 * 1024 * 1024,       // 2MB
    chapterImage: 2 * 1024 * 1024,
    adsImage: 3 * 1024 * 1024,    // ads cần kích thước lớn hơn cho banner
    logo: 1 * 1024 * 1024,
} as const;

/** Limit input gốc client cho user chọn — backend safety net 10MB ở pipe. */
export const MAX_INPUT_BYTES = 50 * 1024 * 1024;
