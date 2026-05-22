import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { API_BASE_URL, apiClient, tokenStorage } from './client';

// If a previous OAuth session was interrupted (e.g. by a page reload on web),
// this helps the SDK clean it up. Cheap no-op on native.
WebBrowser.maybeCompleteAuthSession();

export type OAuthProvider = 'google' | 'facebook';

/** Deep link the backend redirects to after OAuth — must match app.config.ts `scheme`. */
const APP_REDIRECT = 'webtruyen://auth';

const ERROR_MESSAGES: Record<string, string> = {
    oauth_failed: 'Đăng nhập OAuth thất bại. Vui lòng thử lại.',
    verification_required:
        'Tài khoản chưa xác minh email. Vui lòng kiểm tra hộp thư rồi thử lại.',
    email_required:
        'Tài khoản Facebook này chưa có email — vui lòng đăng nhập trên web để bổ sung email.',
};

/**
 * Run the OAuth flow for a provider: open the backend's mobile-init URL in an
 * in-app browser, wait for it to redirect back to `webtruyen://auth?code=...`,
 * then POST that one-time code to /auth/exchange to receive JWTs. Tokens are
 * persisted via tokenStorage.
 *
 * Throws on user cancellation, OAuth error, or a malformed response.
 */
export async function signInWithOAuth(provider: OAuthProvider): Promise<void> {
    const startUrl = `${API_BASE_URL}/auth/${provider}/mobile`;

    const result = await WebBrowser.openAuthSessionAsync(startUrl, APP_REDIRECT);
    if (result.type === 'cancel' || result.type === 'dismiss') {
        throw new Error('Đã huỷ đăng nhập');
    }
    if (result.type !== 'success' || !('url' in result) || !result.url) {
        throw new Error('Đăng nhập không thành công');
    }

    const { queryParams } = Linking.parse(result.url);
    if (queryParams?.error) {
        const err = String(queryParams.error);
        throw new Error(ERROR_MESSAGES[err] ?? `Đăng nhập thất bại: ${err}`);
    }
    const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
    if (!code) throw new Error('Không nhận được mã đăng nhập từ máy chủ.');

    // apiClient already sends `X-Client-Type: mobile`, so /auth/exchange will
    // return the tokens in the body (CookieInterceptor keeps them).
    const exchangeRes = await apiClient.post<{
        accessToken: string;
        refreshToken: string;
    }>('/auth/exchange', { code });
    const payload = (exchangeRes.data?.data ?? exchangeRes.data) as {
        accessToken?: string;
        refreshToken?: string;
    };
    if (!payload.accessToken || !payload.refreshToken) {
        throw new Error('Máy chủ không trả token sau khi đăng nhập OAuth.');
    }
    await tokenStorage.setPair(payload.accessToken, payload.refreshToken);
}
