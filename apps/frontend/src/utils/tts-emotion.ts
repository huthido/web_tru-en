/**
 * Tag biểu cảm giọng đọc AI (VieNeu-TTS v3, experimental) mà tác giả chèn
 * inline trong lời truyện, vd "Nghe hay quá đi [cười]". Tag chỉ dành cho
 * audio AI: bị ẨN khỏi trang đọc và bị loại khỏi text đưa vào Web Speech
 * (giọng thiết bị sẽ đọc "cười" thành lời nếu không lọc); server GIỮ nguyên
 * khi gửi sang worker để model diễn biểu cảm.
 */
export const TTS_EMOTION_TAGS = [
    { tag: '[cười]', desc: 'bật cười nhẹ' },
    { tag: '[thở dài]', desc: 'thở dài' },
    { tag: '[hắng giọng]', desc: 'hắng giọng' },
] as const;

const TAG_REGEX = /\[\s*(cười|thở dài|hắng giọng)\s*\]/gi;

/** Bỏ tag biểu cảm khỏi text/HTML hiển thị hoặc đọc bằng giọng thiết bị. */
export function stripTtsEmotionTags(text: string): string {
    return text.replace(TAG_REGEX, '');
}
