'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/api/hooks/use-auth';
import { rewardsService } from '@/lib/api/rewards.service';
import { GenreOnboardingModal } from './genre-onboarding-modal';

const REF_KEY = 'yeu_ref';
const REF_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function readRef(): string | null {
    try {
        const raw = localStorage.getItem(REF_KEY);
        if (!raw) return null;
        const { code, at } = JSON.parse(raw);
        if (typeof code !== 'string' || Date.now() - Number(at) > REF_TTL_MS) return null;
        return code;
    } catch {
        return null;
    }
}

/**
 * Chạy ngầm trên mọi trang:
 *  - Lưu mã mời từ link `?ref=MA` (người được mời đăng ký sau đó vẫn được ghi nhận).
 *  - Sau khi đăng nhập: gắn người mời (backend chỉ nhận với tài khoản mới ≤7 ngày).
 *  - Đổi tài khoản trên cùng trình duyệt: chuyển đăng ký Web Push sang tài
 *    khoản hiện tại (không để người cũ nhận thông báo của người mới).
 *  - Hỏi thể loại yêu thích một lần (chỉ ở trang chủ).
 */
export function RetentionBootstrap() {
    const pathname = usePathname();
    const { user, isAuthenticated } = useAuth();
    const userId: string | undefined = (user as any)?.id;
    const attachTriedRef = useRef<string | null>(null);
    const pushSyncedRef = useRef<string | null>(null);

    // 1. Bắt ?ref= trên mọi trang
    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const ref = (params.get('ref') || '').trim().toUpperCase();
            if (ref && /^[A-Z0-9]{4,16}$/.test(ref)) {
                localStorage.setItem(REF_KEY, JSON.stringify({ code: ref, at: Date.now() }));
            }
        } catch { /* storage bị chặn */ }
    }, [pathname]);

    // 2. Gắn người mời sau khi đăng nhập
    useEffect(() => {
        if (!isAuthenticated || !userId || attachTriedRef.current === userId) return;
        const code = readRef();
        if (!code) return;
        attachTriedRef.current = userId;
        rewardsService
            .attachReferrer(code)
            .catch(() => undefined)
            .finally(() => {
                // Thành công hay bị từ chối (tài khoản cũ, tự mời…) đều xoá để không gửi lại.
                try { localStorage.removeItem(REF_KEY); } catch { /* bỏ qua */ }
            });
    }, [isAuthenticated, userId]);

    // 3. Đồng bộ chủ sở hữu đăng ký Web Push
    useEffect(() => {
        if (!isAuthenticated || !userId || pushSyncedRef.current === userId) return;
        if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;
        pushSyncedRef.current = userId;
        navigator.serviceWorker
            .getRegistration()
            .then((reg) => (reg ? reg.pushManager.getSubscription() : null))
            .then((sub) => (sub ? rewardsService.webPushSubscribe(sub.toJSON()) : undefined))
            .catch(() => undefined);
    }, [isAuthenticated, userId]);

    return isAuthenticated && pathname === '/' ? <GenreOnboardingModal /> : null;
}
