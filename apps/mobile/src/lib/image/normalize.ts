import * as ImageManipulator from 'expo-image-manipulator';

export interface NormalizeOptions {
    maxWidth?: number;
    compress?: number;
    format?: 'jpeg' | 'png';
}

export interface NormalizedImage {
    uri: string;
    width: number;
    height: number;
    sizeBytes?: number;
}

// Mobile vẫn pre-compress JPEG q0.8 trước upload để tiết kiệm 4G/5G data —
// backend (ImageNormalizePipe) sẽ re-encode về WebP q80 sau cùng. Double-compress
// nhẹ chấp nhận được vì server authoritative, đỡ cảnh "manipulateAsync fail trên
// một số ảnh HEIC iOS" lan tới backend.
export const COVER_NORMALIZE: Required<Pick<NormalizeOptions, 'maxWidth' | 'compress'>> = {
    maxWidth: 1080,
    compress: 0.8,
};

export const CHAPTER_INLINE_NORMALIZE: Required<Pick<NormalizeOptions, 'maxWidth' | 'compress'>> = {
    maxWidth: 1280,
    compress: 0.8,
};

// Limit input gốc cho user pick — cho phép HEIC iPhone gốc 30-50MB; client
// nén lặp lại (normalizeImageToTarget) để output upload ≤ 2MB. Backend giữ
// 10MB safety net.
export const MAX_INPUT_BYTES = 50 * 1024 * 1024;
/** @deprecated dùng MAX_INPUT_BYTES + normalizeImageToTarget thay thế. */
export const MAX_UPLOAD_BYTES = MAX_INPUT_BYTES;

export const NORMALIZE_TARGET = {
    cover: 2 * 1024 * 1024,
    chapterImage: 2 * 1024 * 1024,
} as const;

export async function normalizeImage(
    uri: string,
    opts: NormalizeOptions = {},
): Promise<NormalizedImage> {
    const maxWidth = opts.maxWidth ?? 1080;
    const compress = opts.compress ?? 0.8;
    const format =
        opts.format === 'png'
            ? ImageManipulator.SaveFormat.PNG
            : ImageManipulator.SaveFormat.JPEG;

    const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: maxWidth } }],
        { compress, format },
    );

    let sizeBytes: number | undefined;
    try {
        const res = await fetch(result.uri);
        const blob = await res.blob();
        sizeBytes = blob.size;
    } catch {
        sizeBytes = undefined;
    }

    return {
        uri: result.uri,
        width: result.width,
        height: result.height,
        sizeBytes,
    };
}

/**
 * Nén lặp expo-image-manipulator để output ≤ targetBytes. Mỗi vòng giảm
 * compress 0.15; vòng cuối co maxWidth thêm 30%. Best-effort: nếu hết
 * attempt vẫn vượt target, trả lần tốt nhất + log.
 */
export async function normalizeImageToTarget(
    uri: string,
    baseOpts: NormalizeOptions,
    targetBytes: number,
    maxAttempts: number = 4,
): Promise<NormalizedImage> {
    const baseCompress = baseOpts.compress ?? 0.8;
    const baseMaxWidth = baseOpts.maxWidth ?? 1080;

    let best: NormalizedImage | null = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const compress = Math.max(0.4, baseCompress - attempt * 0.15);
        const dimensionShrink = attempt >= maxAttempts - 1 ? 0.7 : 1;
        const trial = await normalizeImage(uri, {
            ...baseOpts,
            compress,
            maxWidth: Math.round(baseMaxWidth * dimensionShrink),
        });
        if (!best || (trial.sizeBytes ?? Infinity) < (best.sizeBytes ?? Infinity)) {
            best = trial;
        }
        if (trial.sizeBytes !== undefined && trial.sizeBytes <= targetBytes) {
            return trial;
        }
    }
    console.warn(
        `[normalize-to-target] không đạt target sau ${maxAttempts} lần — best=${best?.sizeBytes ?? '?'}B target=${targetBytes}B`,
    );
    return best!;
}
