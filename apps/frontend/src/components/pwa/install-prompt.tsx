
'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const DISMISS_KEY = 'pwa_prompt_dismissed';
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Ẩn nếu user bấm "Để sau" trong vòng 7 ngày (lưu mốc thời gian;
            // giá trị cũ 'true' không phải số → coi như hết hạn).
            let dismissedAt = 0;
            try {
                dismissedAt = Number(localStorage.getItem(DISMISS_KEY)) || 0;
            } catch { }
            if (Date.now() - dismissedAt > DISMISS_MS) {
                setShowPrompt(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setShowPrompt(false);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        try {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch { }
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-surface-container rounded-xl shadow-2xl border border-outline-variant p-4 flex items-start gap-4 ring-1 ring-black/5">
                <div className="bg-primary/10 p-3 rounded-full text-primary shrink-0">
                    <Download size={24} />
                </div>

                <div className="flex-1">
                    <h3 className="font-semibold text-on-surface mb-1">
                        Cài đặt ứng dụng
                    </h3>
                    <p className="text-sm text-on-surface-variant mb-3">
                        Cài đặt YÊU để mở nhanh từ màn hình chính và đọc mượt hơn!
                    </p>

                    <div className="flex gap-2">
                        <button
                            onClick={handleInstallClick}
                            className="bg-primary text-primary-foreground text-sm px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                        >
                            Cài đặt ngay
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="text-on-surface-variant hover:text-on-surface-variant text-sm px-3 py-2 font-medium"
                        >
                            Để sau
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleDismiss}
                    className="text-on-surface-variant hover:text-on-surface-variant hover:text-on-surface transition-colors"
                    aria-label="Close"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
}
