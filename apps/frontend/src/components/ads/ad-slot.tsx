'use client';

import { useSlotAds } from '@/lib/api/hooks/use-ads';
import { AdPosition } from '@/lib/api/ads.service';
import { AdBanner } from './ad-banner';
import { AdSidebar } from './ad-sidebar';

interface AdSlotProps {
    /**
     * Slot key đã seed trong DB. VD 'home.top', 'reading.inline', 'stories.detail.sidebar'.
     * Sai key → backend trả slot=null → component render null.
     */
    slotKey: string;
    className?: string;
    platform?: 'web' | 'mobile';
}

/**
 * Đa năng wrapper render ads của 1 slot. Tự fetch theo `slotKey`, sau đó switch
 * renderer theo `slot.position`:
 * - TOP/BOTTOM/INLINE → <AdBanner ads={...} displayConfig={...} />
 * - SIDEBAR_LEFT/RIGHT → <AdSidebar ads={...} maxAds={...} />
 *
 * Lưu ý: slot position=INLINE thường mount qua <InlineAdsRenderer> để chèn vào
 * giữa nội dung. Dùng <AdSlot> trực tiếp với INLINE chỉ phù hợp khi đặt vào
 * vị trí cố định (không trộn vào HTML).
 *
 * Slot disabled → null. Không có ads → null (banner/sidebar tự handle).
 */
export function AdSlot({ slotKey, className, platform = 'web' }: AdSlotProps) {
    const { data, isLoading } = useSlotAds(slotKey, platform);

    if (isLoading) return null;
    if (!data?.slot || !data.slot.enabled) return null;
    if (data.ads.length === 0) return null;

    // displayConfig của ad đầu tiên dùng làm "tone" chung cho slot — admin set
    // displayConfig per ad nhưng banner rotate, render bằng ad active hiện tại.
    const firstAd = data.ads[0];
    const slotPosition = data.slot.position;

    switch (slotPosition) {
        case AdPosition.SIDEBAR_LEFT:
        case AdPosition.SIDEBAR_RIGHT:
            return (
                <AdSidebar
                    position={slotPosition}
                    ads={data.ads}
                    maxAds={data.slot.maxAds}
                    className={className}
                />
            );

        case AdPosition.TOP:
        case AdPosition.BOTTOM:
        case AdPosition.INLINE:
        default:
            return (
                <AdBanner
                    position={slotPosition}
                    ads={data.ads}
                    displayConfig={firstAd.displayConfig}
                    className={className}
                />
            );
    }
}
