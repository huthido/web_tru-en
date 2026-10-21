'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { rewardsService } from '@/lib/api/rewards.service';
import { useToast } from '@/components/ui/toast';

/** VAPID public key (base64url) → Uint8Array cho PushManager.subscribe. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const raw = window.atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

function pushSupported(): boolean {
    return typeof window !== 'undefined'
        && 'serviceWorker' in navigator
        && 'PushManager' in window
        && 'Notification' in window;
}

function isIosNotInstalled(): boolean {
    if (typeof window === 'undefined') return false;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone = (navigator as any).standalone === true
        || window.matchMedia('(display-mode: standalone)').matches;
    return ios && !standalone;
}

/**
 * Đăng ký service worker (nếu chưa có) rồi đợi nó hoạt động, tối đa `ms`.
 *
 * next-pwa 5.6 chỉ tự đăng ký SW cho Pages Router (entry main.js) — site
 * dùng App Router nên SW không bao giờ tự đăng ký. Cố ý KHÔNG đăng ký cho mọi
 * khách (lần cài tải trước ~180 file / vài MB); chỉ đăng ký khi người dùng
 * chủ động bật thông báo. Lần cài đầu có thể mất vài chục giây trên 3G.
 */
async function ensureRegistration(ms = 60000): Promise<ServiceWorkerRegistration | null> {
    const existing = await navigator.serviceWorker.getRegistration();
    if (!existing) await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
}

export function useWebPushConfig() {
    return useQuery({
        queryKey: ['web-push', 'config'],
        queryFn: rewardsService.getWebPushConfig,
        staleTime: 60 * 60 * 1000,
    });
}

/**
 * Nút bật/tắt "thông báo trên thiết bị" (Web Push): báo chương mới của truyện
 * đang theo dõi, trả lời bình luận… kể cả khi đã đóng web. Ẩn hẳn khi máy chủ
 * chưa cấu hình VAPID hoặc trình duyệt không hỗ trợ.
 */
export function WebPushToggle({ className = '' }: { className?: string }) {
    const { showToast } = useToast();
    const { data: config } = useWebPushConfig();
    const [state, setState] = useState<'loading' | 'on' | 'off' | 'denied'>('loading');
    const [busy, setBusy] = useState(false);
    const [preparing, setPreparing] = useState(false);
    const supported = pushSupported();

    useEffect(() => {
        if (!supported) return;
        let cancelled = false;
        (async () => {
            if (Notification.permission === 'denied') {
                if (!cancelled) setState('denied');
                return;
            }
            const reg = await navigator.serviceWorker.getRegistration();
            const sub = reg ? await reg.pushManager.getSubscription() : null;
            if (!cancelled) setState(sub ? 'on' : 'off');
        })().catch(() => !cancelled && setState('off'));
        return () => {
            cancelled = true;
        };
    }, [supported]);

    if (!config?.enabled || !config.publicKey) return null;

    if (!supported) {
        if (!isIosNotInstalled()) return null;
        return (
            <p className={`text-xs text-on-surface-variant ${className}`}>
                Trên iPhone/iPad: bấm Chia sẻ → “Thêm vào Màn hình chính” để cài YÊU, rồi mở từ màn hình chính để bật thông báo.
            </p>
        );
    }

    const enable = async () => {
        setBusy(true);
        try {
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') {
                setState(perm === 'denied' ? 'denied' : 'off');
                return;
            }
            setPreparing(true);
            const reg = await ensureRegistration();
            setPreparing(false);
            if (!reg) throw new Error('no-sw');
            const sub = (await reg.pushManager.getSubscription())
                || (await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(config.publicKey!) as BufferSource,
                }));
            await rewardsService.webPushSubscribe(sub.toJSON());
            setState('on');
            showToast('Đã bật thông báo trên thiết bị này', 'success');
        } catch {
            showToast('Không bật được thông báo. Hãy thử lại hoặc kiểm tra quyền của trình duyệt.', 'error');
        } finally {
            setPreparing(false);
            setBusy(false);
        }
    };

    const disable = async () => {
        setBusy(true);
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            const sub = reg ? await reg.pushManager.getSubscription() : null;
            if (sub) {
                await rewardsService.webPushUnsubscribe(sub.endpoint).catch(() => undefined);
                await sub.unsubscribe();
            }
            setState('off');
        } finally {
            setBusy(false);
        }
    };

    if (state === 'denied') {
        return (
            <p className={`text-xs text-on-surface-variant ${className}`}>
                Thông báo đang bị chặn — mở cài đặt trang web của trình duyệt để cho phép.
            </p>
        );
    }

    const on = state === 'on';
    return (
        <button
            type="button"
            onClick={on ? disable : enable}
            disabled={busy || state === 'loading'}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors disabled:opacity-60 ${on
                ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                : 'bg-primary text-on-primary hover:bg-primary/90'
                } ${className}`}
        >
            {busy ? <Loader2 size={16} className="animate-spin" /> : on ? <BellOff size={16} /> : <Bell size={16} />}
            {preparing ? 'Đang chuẩn bị… (lần đầu có thể mất ít phút)' : on ? 'Tắt thông báo trên thiết bị' : 'Bật thông báo trên thiết bị'}
        </button>
    );
}
