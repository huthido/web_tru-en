'use client';

import { useState, useEffect } from 'react';
import { Download, Share, X } from 'lucide-react';

const DISMISS_KEY = 'pwa_prompt_dismissed';
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;
const IOS_DISMISS_KEY = 'pwa_ios_hint_dismissed';
const IOS_DISMISS_MS = 30 * 24 * 60 * 60 * 1000;
/** iOS: chờ một lúc rồi mới nhắc (không chen ngang lúc vừa mở trang). */
const IOS_DELAY_MS = 25_000;

function dismissedRecently(key: string, ttl: number): boolean {
    // Giá trị cũ 'true' không phải số → coi như hết hạn.
    try {
        return Date.now() - (Number(localStorage.getItem(key)) || 0) < ttl;
    } catch {
        return false;
    }
}

function rememberDismiss(key: string) {
    try {
        localStorage.setItem(key, String(Date.now()));
    } catch { }
}

/** Safari trên iPhone/iPad, chưa cài lên màn hình chính. */
function isIosSafariNotInstalled(): boolean {
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (ua.indexOf('Macintosh') !== -1 && navigator.maxTouchPoints > 1);
    const safari = ua.indexOf('Safari') !== -1 && !/CriOS|FxiOS|EdgiOS|FBAN|FBAV|Zalo|Instagram/.test(ua);
    const standalone = (navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    return ios && safari && !standalone;
}

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [mode, setMode] = useState<'none' | 'native' | 'ios'>('none');

    useEffect(() => {
        // Android/desktop Chrome: trình duyệt bắn beforeinstallprompt.
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            if (!dismissedRecently(DISMISS_KEY, DISMISS_MS)) setMode('native');
        };
        window.addEventListener('beforeinstallprompt', handler);

        // iOS không có sự kiện đó → hướng dẫn "Chia sẻ → Thêm vào Màn hình chính".
        let iosTimer: ReturnType<typeof setTimeout> | undefined;
        if (isIosSafariNotInstalled() && !dismissedRecently(IOS_DISMISS_KEY, IOS_DISMISS_MS)) {
            iosTimer = setTimeout(() => setMode((m) => (m === 'none' ? 'ios' : m)), IOS_DELAY_MS);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            if (iosTimer) clearTimeout(iosTimer);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setMode('none');
        }
    };

    const handleDismiss = () => {
        rememberDismiss(mode === 'ios' ? IOS_DISMISS_KEY : DISMISS_KEY);
        setMode('none');
    };

    if (mode === 'none') return null;

    const ios = mode === 'ios';
    return (
        <div className="fixed top-[68px] md:top-auto md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in fade-in duration-300">
            <div className="bg-surface-container rounded-xl shadow-2xl border border-outline-variant p-4 flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full text-primary shrink-0">
                    {ios ? <Share size={24} /> : <Download size={24} />}
                </div>

                <div className="flex-1">
                    <h3 className="font-semibold text-on-surface mb-1">Cài YÊU lên màn hình chính</h3>
                    {ios ? (
                        <p className="text-sm text-on-surface-variant mb-3">
                            Bấm nút <b className="text-on-surface">Chia sẻ</b> <Share size={14} className="inline -mt-0.5" /> ở thanh dưới Safari,
                            rồi chọn <b className="text-on-surface">“Thêm vào Màn hình chính”</b> để mở nhanh như app và nhận thông báo chương mới.
                        </p>
                    ) : (
                        <p className="text-sm text-on-surface-variant mb-3">
                            Mở nhanh từ màn hình chính, đọc mượt hơn và nhận thông báo chương mới.
                        </p>
                    )}

                    <div className="flex gap-2">
                        {!ios && (
                            <button
                                onClick={handleInstallClick}
                                className="bg-primary text-on-primary text-sm px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                            >
                                Cài đặt ngay
                            </button>
                        )}
                        <button
                            onClick={handleDismiss}
                            className="text-on-surface-variant hover:text-on-surface text-sm px-3 py-2 font-medium"
                        >
                            {ios ? 'Đã hiểu' : 'Để sau'}
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleDismiss}
                    className="text-on-surface-variant hover:text-on-surface transition-colors"
                    aria-label="Đóng"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
}
