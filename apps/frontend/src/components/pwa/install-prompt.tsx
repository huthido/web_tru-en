
'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Check if user has already dismissed it recently
            const isDismissed = localStorage.getItem('pwa_prompt_dismissed');
            if (!isDismissed) {
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
        // Remember dismissal for 7 days
        localStorage.setItem('pwa_prompt_dismissed', 'true');
        setTimeout(() => {
            localStorage.removeItem('pwa_prompt_dismissed');
        }, 7 * 24 * 60 * 60 * 1000);
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-start gap-4 ring-1 ring-black/5">
                <div className="bg-primary/10 p-3 rounded-full text-primary shrink-0">
                    <Download size={24} />
                </div>

                <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        Cài đặt ứng dụng
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Cài đặt Web Truyện để đọc nhanh hơn và dùng khi không có mạng!
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
                            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm px-3 py-2 font-medium"
                        >
                            Để sau
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleDismiss}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    aria-label="Close"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
}
