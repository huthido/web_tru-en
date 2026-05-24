'use client';

import Link from 'next/link';
import { Cookie } from 'lucide-react';
import { useAdsConsent } from '@/lib/ads/consent-context';
import { useAdsConfig } from '@/lib/api/hooks/use-ads-config';

/**
 * Banner GDPR cố định ở đáy trang lần đầu user vào. Chỉ hiện khi
 * `Settings.consentRequired = true` và user chưa chọn. Sau khi chọn,
 * `AdsConsentProvider` lưu localStorage + cập nhật state → banner ẩn,
 * các component ad (AdSense / Custom Script) đọc `consented` để biết
 * có được load script hay không.
 */
export function ConsentBanner() {
    const { consent, accept, reject } = useAdsConsent();
    const { data: config } = useAdsConfig();

    if (consent !== 'unknown') return null;
    if (!config?.consentRequired) return null;

    return (
        <div className="fixed bottom-0 inset-x-0 z-[9999] p-3 sm:p-4 pointer-events-none">
            <div className="pointer-events-auto max-w-3xl mx-auto bg-surface-container border border-outline-variant rounded-xl shadow-lg p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <div className="flex items-start gap-3 flex-1">
                    <span className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                        <Cookie className="w-5 h-5 text-on-primary-container" />
                    </span>
                    <p className="text-sm text-on-surface leading-relaxed">
                        Chúng tôi dùng cookie và quảng cáo cá nhân hoá (Google AdSense, AdMob…)
                        để duy trì website miễn phí. Bạn có thể từ chối nếu muốn — chỉ hiển thị
                        ads chung. Xem{' '}
                        <Link href="/gioi-thieu/chinh-sach-bao-mat" className="text-primary underline">
                            Chính sách
                        </Link>
                        .
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 self-stretch sm:self-auto">
                    <button
                        type="button"
                        onClick={reject}
                        className="px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
                    >
                        Chỉ thiết yếu
                    </button>
                    <button
                        type="button"
                        onClick={accept}
                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity"
                    >
                        Đồng ý
                    </button>
                </div>
            </div>
        </div>
    );
}
