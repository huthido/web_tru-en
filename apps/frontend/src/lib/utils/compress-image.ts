/**
 * Client-side image compression utility using Canvas API.
 * Compresses images before upload to reduce bandwidth and storage.
 */

export interface CompressOptions {
    /** Max width in pixels (default: 1920) */
    maxWidth?: number;
    /** Max height in pixels (default: 1920) */
    maxHeight?: number;
    /** JPEG/WebP quality 0-1 (default: 0.8) */
    quality?: number;
    /** Output MIME type (default: 'image/jpeg') */
    outputType?: 'image/jpeg' | 'image/webp' | 'image/png';
    /** Max file size in bytes — if original is smaller, skip compression */
    skipIfSmallerThan?: number;
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.8,
    outputType: 'image/jpeg',
    skipIfSmallerThan: 100 * 1024, // 100KB
};

/**
 * Compress an image file using Canvas API.
 * Returns the compressed file (or original if already small enough).
 */
export async function compressImage(
    file: File,
    options: CompressOptions = {}
): Promise<File> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Skip non-image files
    if (!file.type.startsWith('image/')) {
        return file;
    }

    // Skip GIFs (animation would be lost)
    if (file.type === 'image/gif') {
        return file;
    }

    // Skip if file is already small
    if (file.size <= opts.skipIfSmallerThan) {
        console.log(`[compress] Skipped: ${file.name} (${formatSize(file.size)} < ${formatSize(opts.skipIfSmallerThan)})`);
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

        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.warn('[compress] Canvas context unavailable, returning original');
            return file;
        }

        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();

        const blob = await canvas.convertToBlob({
            type: opts.outputType,
            quality: opts.quality,
        });

        // Generate new filename with correct extension
        const ext = opts.outputType === 'image/webp' ? '.webp'
            : opts.outputType === 'image/png' ? '.png'
                : '.jpg';
        const baseName = file.name.replace(/\.[^.]+$/, '');
        const newName = baseName + ext;

        const compressed = new File([blob], newName, { type: opts.outputType });

        // Only use compressed if it's actually smaller
        if (compressed.size >= file.size) {
            console.log(`[compress] Compressed is larger (${formatSize(compressed.size)} >= ${formatSize(file.size)}), using original`);
            return file;
        }

        const ratio = ((1 - compressed.size / file.size) * 100).toFixed(0);
        console.log(
            `[compress] ${file.name}: ${formatSize(file.size)} → ${formatSize(compressed.size)} (-${ratio}%)`
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
