/**
 * App Tracking Transparency (ATT) — Apple iOS 14.5+ §5.1.2
 *
 * Bao bọc `expo-tracking-transparency` để mã chỗ khác chỉ cần gọi
 * `requestAdTrackingIfNeeded()` trước khi load bất kỳ SDK quảng cáo
 * third-party nào (AdMob, Facebook Audience Network…).
 *
 * Hiện tại app v1 KHÔNG dùng third-party ad SDK — chỉ self-served banner
 * fetch từ backend qua JWT — nên KHÔNG gọi prompt. Để dành scaffold cho v2.
 *
 * QUY TẮC: chỉ prompt khi context tracking phát sinh thật (Apple sẽ reject
 * nếu prompt vô cớ ngay khi mở app lần đầu).
 */

import { Platform } from 'react-native';

let _lib: typeof import('expo-tracking-transparency') | null = null;

function load() {
    if (_lib) return _lib;
    try {
        _lib = require('expo-tracking-transparency');
    } catch {
        return null;
    }
    return _lib;
}

export type AttStatus = 'granted' | 'denied' | 'undetermined' | 'restricted' | 'unsupported';

/** Đọc trạng thái hiện tại (không prompt). */
export async function getTrackingStatus(): Promise<AttStatus> {
    if (Platform.OS !== 'ios') return 'unsupported';
    const lib = load();
    if (!lib) return 'unsupported';
    const res = await lib.getTrackingPermissionsAsync();
    return (res.status as AttStatus) ?? 'undetermined';
}

/**
 * Prompt ATT nếu cần thiết. Trả `true` nếu user cho phép tracking
 * (hoặc trên Android/web — coi như allowed vì ATT không áp dụng).
 *
 * Phải được gọi NGAY TRƯỚC khi load ad SDK third-party lần đầu, không gọi
 * sớm hơn (Apple Review sẽ reject nếu prompt vô cớ).
 */
export async function requestAdTrackingIfNeeded(): Promise<boolean> {
    if (Platform.OS !== 'ios') return true;
    const lib = load();
    if (!lib) return true;
    const current = await lib.getTrackingPermissionsAsync();
    if (current.status === 'granted') return true;
    if (current.status === 'denied' || current.status === 'restricted') return false;
    // undetermined → prompt
    const res = await lib.requestTrackingPermissionsAsync();
    return res.status === 'granted';
}
