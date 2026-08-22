import { concatMp3, splitForWorker } from './tts.service';

describe('splitForWorker', () => {
    it('text ngắn hơn giới hạn thì giữ nguyên một phần', () => {
        expect(splitForWorker('Một câu ngắn.', 100)).toEqual(['Một câu ngắn.']);
    });

    it('cắt theo ranh giới câu, không phần nào vượt giới hạn', () => {
        const text = Array.from({ length: 40 }, (_, i) => `Câu số ${i} dài vừa phải.`).join(' ');
        const parts = splitForWorker(text, 200);

        expect(parts.length).toBeGreaterThan(1);
        for (const part of parts) expect(part.length).toBeLessThanOrEqual(200);
        // Không mất chữ nào: ghép lại (bỏ khác biệt khoảng trắng) ra text gốc.
        expect(parts.join(' ').replace(/\s+/g, ' ')).toBe(text.replace(/\s+/g, ' '));
        // Mỗi phần kết thúc bằng dấu câu → không cắt giữa câu.
        for (const part of parts) expect(part.endsWith('.')).toBe(true);
    });

    it('câu đơn dài hơn giới hạn thì cắt cứng chứ không treo', () => {
        const parts = splitForWorker('a'.repeat(250), 100);
        expect(parts.map((p) => p.length)).toEqual([100, 100, 50]);
    });
});

// MPEG2 Layer III, 24kHz, 64kbps, mono — đúng định dạng worker xuất ra.
const FRAME_LEN = 192;

function frame(marker?: string): Buffer {
    const buf = Buffer.alloc(FRAME_LEN);
    buf[0] = 0xff;
    buf[1] = 0xf3; // sync + MPEG2 + Layer III
    buf[2] = 0x84; // 64kbps, 24kHz, không padding
    buf[3] = 0xc0; // mono
    if (marker) buf.write(marker, 13, 'latin1'); // vị trí tag Xing/Info sau side info
    return buf;
}

/** Một file MP3 như ffmpeg xuất: ID3v2 + frame Xing/Info + n frame audio. */
function mp3File(frames: number, tag: 'Xing' | 'Info' = 'Info'): Buffer {
    const id3 = Buffer.alloc(10 + 64);
    id3.write('ID3', 0, 'latin1');
    id3[3] = 0x04;
    id3[9] = 64; // size syncsafe = 64 byte
    return Buffer.concat([id3, frame(tag), ...Array.from({ length: frames }, () => frame())]);
}

describe('concatMp3', () => {
    it('một phần thì trả nguyên bản (giữ Xing của chính nó)', () => {
        const only = mp3File(3);
        expect(concatMp3([only])).toBe(only);
    });

    it('nhiều phần: bỏ ID3 + Xing của MỌI phần, chỉ còn frame audio', () => {
        const out = concatMp3([mp3File(3), mp3File(5, 'Xing'), mp3File(2)]);

        expect(out.length).toBe((3 + 5 + 2) * FRAME_LEN);
        expect(out.subarray(0, 3).toString('latin1')).not.toBe('ID3');
        expect(out.toString('latin1')).not.toMatch(/Xing|Info/);
        // Mọi frame nối liền nhau, không sót byte rác giữa các phần.
        for (let i = 0; i < out.length; i += FRAME_LEN) {
            expect(out[i]).toBe(0xff);
            expect(out[i + 1]).toBe(0xf3);
        }
    });

    it('bỏ cả ID3v1 ở cuối phần', () => {
        const tail = Buffer.alloc(128);
        tail.write('TAG', 0, 'latin1');
        const out = concatMp3([Buffer.concat([mp3File(2), tail]), mp3File(1)]);
        expect(out.length).toBe(3 * FRAME_LEN);
    });
});
