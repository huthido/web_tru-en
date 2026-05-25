import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { NotificationsApi } from '../api/notifications.service';

/**
 * Đăng ký device để nhận push notification.
 *
 * - Chỉ hoạt động trên device thật (Expo Go emulator không nhận push).
 * - iOS: yêu cầu permission qua dialog OS; user reject thì return null.
 * - Android: tự tạo channel "default" với importance MAX.
 * - Token Expo (ExponentPushToken[xxx]) được gửi về backend `/notifications/push-tokens`.
 *
 * Gọi 1 lần sau khi user login thành công. Logout nên gọi `unregisterPush()`.
 */
export async function registerForPush(): Promise<string | null> {
    if (!Device.isDevice) return null;

    const existing = await Notifications.getPermissionsAsync();
    let final = existing.status;
    if (existing.status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        final = req.status;
    }
    if (final !== 'granted') return null;

    const projectId =
        (Constants.expoConfig as any)?.extra?.eas?.projectId ??
        (Constants as any).easConfig?.projectId;
    const tokenResult = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
    );
    const token = tokenResult.data;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            lightColor: '#635D60',
        });
    }

    try {
        await NotificationsApi.registerPushToken(
            token,
            Platform.OS as 'ios' | 'android',
        );
    } catch (e) {
        // Best-effort — không phá UX login nếu backend tạm down.
        if (__DEV__) console.warn('[push] register backend failed:', e);
    }

    return token;
}

/**
 * Gọi khi logout — xoá token khỏi backend để không gửi push tới user
 * đã logout trên thiết bị này.
 */
export async function unregisterPush(token: string | null) {
    if (!token) return;
    try {
        await NotificationsApi.deletePushToken(token);
    } catch (e) {
        if (__DEV__) console.warn('[push] unregister failed:', e);
    }
}
