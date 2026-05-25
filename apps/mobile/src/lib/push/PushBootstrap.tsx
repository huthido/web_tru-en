import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { useAuth } from '@/contexts/auth-context';
import { registerForPush } from './registerPush';

/**
 * Component không render UI — chỉ cắm side-effect:
 *
 * 1. Khi user login → gọi `registerForPush()` để xin permission + lưu
 *    Expo push token vào backend.
 * 2. Cắm `addNotificationResponseReceivedListener` để khi user tap push
 *    (app background/quit), điều hướng tới `actionUrl` (Linking.openURL).
 * 3. Foreground notification handler đã được setup ở App.tsx (alert +
 *    sound + badge bật).
 *
 * Đặt component này bên trong `<AuthProvider>` để có quyền dùng `useAuth`.
 */
export function PushBootstrap() {
    const { user } = useAuth();
    const tokenRef = useRef<string | null>(null);

    useEffect(() => {
        if (!user) return;
        (async () => {
            const t = await registerForPush();
            if (t) tokenRef.current = t;
        })();
    }, [user?.id]);

    useEffect(() => {
        const sub = Notifications.addNotificationResponseReceivedListener((response) => {
            const data: any = response.notification.request.content.data ?? {};
            const actionUrl: string | undefined = data?.actionUrl;
            if (!actionUrl) return;
            // Cho phép cả deep-link (yeuyeu://...) lẫn web URL relative
            // (/story/abc). Nếu là relative path → ghép base; tự `Linking.openURL`
            // sẽ điều hướng theo schema config của Expo Router/Linking.
            const target = actionUrl.startsWith('http') || actionUrl.includes('://')
                ? actionUrl
                : Linking.createURL(actionUrl);
            Linking.openURL(target).catch(() => undefined);
        });
        return () => sub.remove();
    }, []);

    return null;
}
