import { apiClient } from './client';
import { ApiResponse } from './client';

/** Một mức giá gói giọng đọc AI: `months` tháng (30 ngày/tháng) giá `coins` xu. */
export interface TtsSubscriptionPlan {
    months: number;
    coins: number;
}

export interface Settings {
    id: string;
    siteName: string;
    siteDescription?: string;
    siteLogo?: string;
    siteFavicon?: string;
    siteEmail?: string;
    sitePhone?: string;
    siteAddress?: string;
    siteFacebook?: string;
    siteTwitter?: string;
    siteX?: string;
    siteYoutube?: string;
    siteInstagram?: string;
    siteTikTok?: string;
    siteLinkedIn?: string;
    siteThreads?: string;
    maintenanceMode: boolean;
    maintenanceMessage?: string;
    /** Thay hẳn footer (chỉ hiện ở trang cá nhân) bằng 1 ảnh banner khi bật. */
    footerBannerEnabled?: boolean;
    footerBannerImage?: string | null;
    footerBannerLink?: string | null;
    allowRegistration: boolean;
    requireEmailVerification: boolean;
    donationPlatformFeePercent: number;
    /** Phí % platform giữ khi tác giả bán chương / truyện VIP. */
    chapterSaleFeePercent: number;
    allowCoinTransfer?: boolean;
    /** Cho phép độc giả tải xuống file audio chương (audio tác giả + AI). */
    chapterAudioDownloadEnabled?: boolean;
    /** Chống copy nội dung chương trên trang đọc (mặc định bật). */
    copyProtectionEnabled?: boolean;
    minWithdrawalCoins?: number;
    /** Tự tạo giọng đọc AI khi chương được xuất bản (mặc định tắt). */
    ttsAutoGenerateOnPublish?: boolean;
    /** Bảng giá gói giọng đọc AI cho tác giả [{months, coins}]; rỗng = miễn phí. */
    ttsSubscriptionPlans?: TtsSubscriptionPlan[];
    allowedImageDomains?: string[];
    /** Hiện cổng VNPay trong Hình thức thanh toán ở Cửa hàng (mặc định bật). */
    vnpayPaymentEnabled?: boolean;
    // --- Thanh toán thủ công (chuyển khoản, admin xác nhận tay) ---
    manualPaymentEnabled?: boolean;
    manualPaymentBankBin?: string | null;
    manualPaymentBankName?: string | null;
    manualPaymentAccountNumber?: string | null;
    manualPaymentAccountHolder?: string | null;
    manualPaymentInstructions?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface UpdateSettingsRequest {
    siteName?: string;
    siteDescription?: string;
    siteLogo?: string;
    siteFavicon?: string;
    siteEmail?: string;
    sitePhone?: string;
    siteAddress?: string;
    siteFacebook?: string;
    siteTwitter?: string;
    siteX?: string;
    siteYoutube?: string;
    siteInstagram?: string;
    siteTikTok?: string;
    siteLinkedIn?: string;
    siteThreads?: string;
    maintenanceMode?: boolean;
    maintenanceMessage?: string;
    footerBannerEnabled?: boolean;
    footerBannerImage?: string;
    footerBannerLink?: string;
    allowRegistration?: boolean;
    requireEmailVerification?: boolean;
    donationPlatformFeePercent?: number;
    chapterSaleFeePercent?: number;
    allowCoinTransfer?: boolean;
    chapterAudioDownloadEnabled?: boolean;
    copyProtectionEnabled?: boolean;
    minWithdrawalCoins?: number;
    ttsAutoGenerateOnPublish?: boolean;
    ttsSubscriptionPlans?: TtsSubscriptionPlan[];
    allowedImageDomains?: string[];
    vnpayPaymentEnabled?: boolean;
    // --- Thanh toán thủ công ---
    manualPaymentEnabled?: boolean;
    manualPaymentBankBin?: string;
    manualPaymentBankName?: string;
    manualPaymentAccountNumber?: string;
    manualPaymentAccountHolder?: string;
    manualPaymentInstructions?: string;
}

export const settingsService = {
    get: async (): Promise<Settings> => {
        const response = await apiClient.get<Settings>('/settings');
        if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'id' in (response.data as any).data) {
            return (response.data as any).data as Settings;
        }
        return (response.data as unknown as Settings);
    },

    update: async (data: UpdateSettingsRequest): Promise<Settings> => {
        const response = await apiClient.patch<Settings>('/settings', data);
        if ((response.data as any)?.data && typeof (response.data as any).data === 'object' && 'id' in (response.data as any).data) {
            return (response.data as any).data as Settings;
        }
        return (response.data as unknown as Settings);
    },

    uploadLogo: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await apiClient.post<{ url: string }>(
            '/settings/upload-logo',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        if ((response.data as any)?.data?.url) {
            return (response.data as any).data.url;
        }
        if ((response.data as any)?.url) {
            return (response.data as any).url;
        }
        return '';
    },

    uploadFavicon: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await apiClient.post<{ url: string }>(
            '/settings/upload-favicon',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        if ((response.data as any)?.data?.url) {
            return (response.data as any).data.url;
        }
        if ((response.data as any)?.url) {
            return (response.data as any).url;
        }
        return '';
    },

    uploadFooterBanner: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await apiClient.post<{ url: string }>(
            '/settings/upload-footer-banner',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );
        if ((response.data as any)?.data?.url) {
            return (response.data as any).data.url;
        }
        if ((response.data as any)?.url) {
            return (response.data as any).url;
        }
        return '';
    },
};
