import { isInternalSsrRequest } from './internal-aware-throttler.guard';

describe('isInternalSsrRequest', () => {
    const secret = 'a'.repeat(64);
    it('khớp đúng khoá', () => expect(isInternalSsrRequest(secret, secret)).toBe(true));
    it('sai khoá', () => expect(isInternalSsrRequest('b'.repeat(64), secret)).toBe(false));
    it('thiếu header', () => expect(isInternalSsrRequest(undefined, secret)).toBe(false));
    it('khoá chưa cấu hình / quá ngắn → tắt', () => {
        expect(isInternalSsrRequest('', '')).toBe(false);
        expect(isInternalSsrRequest('short', 'short')).toBe(false);
        expect(isInternalSsrRequest(secret, undefined)).toBe(false);
    });
    it('header dạng mảng không được chấp nhận', () => expect(isInternalSsrRequest([secret], secret)).toBe(false));
});
