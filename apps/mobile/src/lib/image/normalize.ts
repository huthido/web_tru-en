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

// 5MB — đủ chỗ cho ảnh HEIC iPhone sau khi mobile resize+JPEG. Backend giới
// hạn cứng 10MB; client check trước để fail-fast không tốn upload.
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

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
