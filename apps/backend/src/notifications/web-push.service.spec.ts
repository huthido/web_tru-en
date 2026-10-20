import { isAllowedPushEndpoint } from './web-push.service';

describe('isAllowedPushEndpoint (chống SSRF)', () => {
    it.each([
        'https://fcm.googleapis.com/fcm/send/abc',
        'https://updates.push.services.mozilla.com/wpush/v2/abc',
        'https://wns2-par02p.notify.windows.com/w/?token=abc',
        'https://web.push.apple.com/QGx',
    ])('nhận dịch vụ push chính thức: %s', (url) => {
        expect(isAllowedPushEndpoint(url)).toBe(true);
    });

    it.each([
        'http://fcm.googleapis.com/fcm/send/abc', // không https
        'https://fcm.googleapis.com:8443/x', // sai cổng
        'https://169.254.169.254/latest/meta-data', // metadata cloud
        'https://127.0.0.1/x',
        'https://localhost/x',
        'https://evil.com/fcm.googleapis.com',
        'https://fcm.googleapis.com.evil.com/x', // hậu tố giả
        'https://user:pw@fcm.googleapis.com/x',
        'not a url',
    ])('chặn: %s', (url) => {
        expect(isAllowedPushEndpoint(url)).toBe(false);
    });
});
