'use client';

import { RefreshButton } from '@/components/admin/refresh-button';
import { useState, useRef, useEffect } from 'react';
import { useSettings, useUpdateSettings, useUploadLogo, useUploadFavicon } from '@/lib/api/hooks/use-settings';
import { useToast } from '@/components/ui/toast';
import { Loading } from '@/components/ui/loading';
import Image from 'next/image';
import { isUsableImageSrc } from '@/utils/image-utils';

const BUILTIN_DOMAINS = [
    'res.cloudinary.com',
    'static.truyenfull.vision',
    'cache.staticscdn.net',
    'iads.staticscdn.net',
    'images.unsplash.com',
    'lh3.googleusercontent.com',
    'gtvseo.com',
    'ui-avatars.com',
    'i.pinimg.com',
];

// Ngân hàng VN + mã BIN chuẩn VietQR (dùng cho img.vietqr.io). Danh sách phổ
// biến; admin chọn để tự điền BIN + tên hiển thị.
const VN_BANKS: { bin: string; name: string }[] = [
    { bin: '970436', name: 'Vietcombank (VCB)' },
    { bin: '970407', name: 'Techcombank (TCB)' },
    { bin: '970418', name: 'BIDV' },
    { bin: '970415', name: 'VietinBank (CTG)' },
    { bin: '970405', name: 'Agribank' },
    { bin: '970422', name: 'MB Bank (MB)' },
    { bin: '970416', name: 'ACB' },
    { bin: '970432', name: 'VPBank' },
    { bin: '970423', name: 'TPBank' },
    { bin: '970403', name: 'Sacombank (STB)' },
    { bin: '970426', name: 'MSB' },
    { bin: '970443', name: 'SHB' },
    { bin: '970441', name: 'VIB' },
    { bin: '970437', name: 'HDBank' },
    { bin: '970448', name: 'OCB' },
    { bin: '970440', name: 'SeABank' },
    { bin: '970431', name: 'Eximbank' },
    { bin: '970428', name: 'Nam A Bank' },
    { bin: '970409', name: 'Bac A Bank' },
    { bin: '970454', name: 'BVBank (Ban Viet)' },
    { bin: '970429', name: 'SCB' },
    { bin: '970438', name: 'BaoViet Bank' },
    { bin: '970406', name: 'DongA Bank' },
    { bin: '970414', name: 'Ocean Bank' },
    { bin: '546034', name: 'Cake by VPBank' },
];

export default function AdminSettingsPage() {
    const { data: settings, isLoading } = useSettings();
    const updateMutation = useUpdateSettings();
    const uploadLogoMutation = useUploadLogo();
    const uploadFaviconMutation = useUploadFavicon();
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        siteName: '',
        siteDescription: '',
        siteLogo: '',
        siteFavicon: '',
        siteEmail: '',
        sitePhone: '',
        siteAddress: '',
        siteFacebook: '',
        siteTwitter: '',
        siteX: '',
        siteYoutube: '',
        siteInstagram: '',
        siteTikTok: '',
        siteLinkedIn: '',
        siteThreads: '',
        requireEmailVerification: false,
        donationPlatformFeePercent: 2,
        chapterSaleFeePercent: 2,
        allowCoinTransfer: false,
        // --- Thanh toán thủ công (chuyển khoản) ---
        manualPaymentEnabled: false,
        manualPaymentBankBin: '',
        manualPaymentBankName: '',
        manualPaymentAccountNumber: '',
        manualPaymentAccountHolder: '',
        manualPaymentInstructions: '',
        // --- Quảng cáo ---
        adsEnabled: true,
        consentRequired: true,
        allowedImageDomains: [] as string[],
        googleAdsensePublisherId: '',
        admobAndroidAppId: '',
        admobIosAppId: '',
        fanPlacementId: '',
        adsTxtContent: '',
    });

    const [newDomain, setNewDomain] = useState('');
    const logoInputRef = useRef<HTMLInputElement>(null);
    const faviconInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (settings) {
            setFormData({
                siteName: settings.siteName || '',
                siteDescription: settings.siteDescription || '',
                siteLogo: settings.siteLogo || '',
                siteFavicon: settings.siteFavicon || '',
                siteEmail: settings.siteEmail || '',
                sitePhone: settings.sitePhone || '',
                siteAddress: settings.siteAddress || '',
                siteFacebook: settings.siteFacebook || '',
                siteTwitter: settings.siteTwitter || '',
                siteX: settings.siteX || '',
                siteYoutube: settings.siteYoutube || '',
                siteInstagram: settings.siteInstagram || '',
                siteTikTok: settings.siteTikTok || '',
                siteLinkedIn: settings.siteLinkedIn || '',
                siteThreads: settings.siteThreads || '',
                requireEmailVerification: settings.requireEmailVerification || false,
                donationPlatformFeePercent: settings.donationPlatformFeePercent ?? 2,
                chapterSaleFeePercent: settings.chapterSaleFeePercent ?? 2,
                allowCoinTransfer: settings.allowCoinTransfer || false,
                manualPaymentEnabled: (settings as any).manualPaymentEnabled ?? false,
                manualPaymentBankBin: (settings as any).manualPaymentBankBin || '',
                manualPaymentBankName: (settings as any).manualPaymentBankName || '',
                manualPaymentAccountNumber: (settings as any).manualPaymentAccountNumber || '',
                manualPaymentAccountHolder: (settings as any).manualPaymentAccountHolder || '',
                manualPaymentInstructions: (settings as any).manualPaymentInstructions || '',
                adsEnabled: (settings as any).adsEnabled ?? true,
                consentRequired: (settings as any).consentRequired ?? true,
                allowedImageDomains: (settings as any).allowedImageDomains ?? [],
                googleAdsensePublisherId: (settings as any).googleAdsensePublisherId || '',
                admobAndroidAppId: (settings as any).admobAndroidAppId || '',
                admobIosAppId: (settings as any).admobIosAppId || '',
                fanPlacementId: (settings as any).fanPlacementId || '',
                adsTxtContent: (settings as any).adsTxtContent || '',
            });
        }
    }, [settings]);

    const handleSave = async () => {
        try {
            await updateMutation.mutateAsync(formData);
            showToast('Đã lưu cài đặt thành công', 'success');
        } catch (error: any) {
            // Xử lý lỗi validation từ backend
            const errorData = error?.response?.data;
            let errorMessage = 'Có lỗi xảy ra khi lưu cài đặt';
            
            if (errorData) {
                // Nếu lỗi là array (validation errors)
                if (Array.isArray(errorData.error)) {
                    errorMessage = errorData.error.join('. ');
                } 
                // Nếu lỗi là string
                else if (typeof errorData.error === 'string') {
                    errorMessage = errorData.error;
                }
                // Nếu có message
                else if (errorData.message) {
                    errorMessage = errorData.message;
                }
            }
            
            showToast(errorMessage, 'error');
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const url = await uploadLogoMutation.mutateAsync(file);
            setFormData({ ...formData, siteLogo: url });
            showToast('Đã tải logo lên thành công', 'success');
        } catch (error: any) {
            showToast(error?.response?.data?.error || 'Có lỗi xảy ra khi tải logo', 'error');
        }
    };

    const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const url = await uploadFaviconMutation.mutateAsync(file);
            setFormData({ ...formData, siteFavicon: url });
            showToast('Đã tải favicon lên thành công', 'success');
        } catch (error: any) {
            showToast(error?.response?.data?.error || 'Có lỗi xảy ra khi tải favicon', 'error');
        }
    };

    if (isLoading) {
        return (
            <>
                <Loading />
            </>
        );
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Cài đặt</h1>
                        <p className="text-sm sm:text-base text-on-surface-variant mt-1 sm:mt-2">Cấu hình hệ thống</p>
                    </div>
                    <RefreshButton />
                </div>

                <div className="space-y-6">
                    {/* Thông tin cơ bản */}
                    <div className="bg-surface-container rounded-lg p-6 shadow-sm space-y-6">
                        <h2 className="text-xl font-bold text-on-surface">Thông tin cơ bản</h2>

                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                Tên website
                            </label>
                            <input
                                type="text"
                                value={formData.siteName}
                                onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                                className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                Mô tả website
                            </label>
                            <textarea
                                value={formData.siteDescription}
                                onChange={(e) => setFormData({ ...formData, siteDescription: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Logo website
                                </label>
                                <div className="space-y-3">
                                    {isUsableImageSrc(formData.siteLogo) && (
                                        <div className="relative w-32 h-32 border border-outline-variant rounded-lg overflow-hidden">
                                            <Image
                                                src={formData.siteLogo}
                                                alt="Logo"
                                                fill
                                                className="object-contain"
                                            />
                                        </div>
                                    )}
                                    <input
                                        ref={logoInputRef}
                                        type="file"
                                        accept="image/*,.heic,.heif"
                                        onChange={handleLogoUpload}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => logoInputRef.current?.click()}
                                        disabled={uploadLogoMutation.isPending}
                                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        {uploadLogoMutation.isPending ? 'Đang tải...' : formData.siteLogo ? 'Thay đổi logo' : 'Tải logo lên'}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Favicon
                                </label>
                                <div className="space-y-3">
                                    {isUsableImageSrc(formData.siteFavicon) && (
                                        <div className="relative w-16 h-16 border border-outline-variant rounded-lg overflow-hidden">
                                            <Image
                                                src={formData.siteFavicon}
                                                alt="Favicon"
                                                fill
                                                className="object-contain"
                                            />
                                        </div>
                                    )}
                                    <input
                                        ref={faviconInputRef}
                                        type="file"
                                        accept="image/*,.heic,.heif"
                                        onChange={handleFaviconUpload}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => faviconInputRef.current?.click()}
                                        disabled={uploadFaviconMutation.isPending}
                                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        {uploadFaviconMutation.isPending ? 'Đang tải...' : formData.siteFavicon ? 'Thay đổi favicon' : 'Tải favicon lên'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Thông tin liên hệ */}
                    <div className="bg-surface-container rounded-lg p-6 shadow-sm space-y-6">
                        <h2 className="text-xl font-bold text-on-surface">Thông tin liên hệ</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.siteEmail}
                                    onChange={(e) => setFormData({ ...formData, siteEmail: e.target.value })}
                                    className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Số điện thoại
                                </label>
                                <input
                                    type="tel"
                                    value={formData.sitePhone}
                                    onChange={(e) => setFormData({ ...formData, sitePhone: e.target.value })}
                                    className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                Địa chỉ
                            </label>
                            <textarea
                                value={formData.siteAddress}
                                onChange={(e) => setFormData({ ...formData, siteAddress: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                            />
                        </div>
                    </div>

                    {/* Mạng xã hội */}
                    <div className="bg-surface-container rounded-lg p-6 shadow-sm space-y-6">
                        <h2 className="text-xl font-bold text-on-surface">Mạng xã hội</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Facebook URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.siteFacebook}
                                    onChange={(e) => setFormData({ ...formData, siteFacebook: e.target.value })}
                                    className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                    placeholder="https://facebook.com/..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Twitter URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.siteTwitter}
                                    onChange={(e) => setFormData({ ...formData, siteTwitter: e.target.value })}
                                    className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                    placeholder="https://twitter.com/..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    X (Twitter) URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.siteX}
                                    onChange={(e) => setFormData({ ...formData, siteX: e.target.value })}
                                    className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                    placeholder="https://x.com/..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    YouTube URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.siteYoutube}
                                    onChange={(e) => setFormData({ ...formData, siteYoutube: e.target.value })}
                                    className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                    placeholder="https://youtube.com/..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Instagram URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.siteInstagram}
                                    onChange={(e) => setFormData({ ...formData, siteInstagram: e.target.value })}
                                    className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                    placeholder="https://instagram.com/..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    TikTok URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.siteTikTok}
                                    onChange={(e) => setFormData({ ...formData, siteTikTok: e.target.value })}
                                    className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                    placeholder="https://tiktok.com/@..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    LinkedIn URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.siteLinkedIn}
                                    onChange={(e) => setFormData({ ...formData, siteLinkedIn: e.target.value })}
                                    className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                    placeholder="https://linkedin.com/company/..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-2">
                                    Threads URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.siteThreads}
                                    onChange={(e) => setFormData({ ...formData, siteThreads: e.target.value })}
                                    className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                    placeholder="https://threads.net/@..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Cài đặt hệ thống */}
                    <div className="bg-surface-container rounded-lg p-6 shadow-sm space-y-6">
                        <h2 className="text-xl font-bold text-on-surface">Cài đặt hệ thống</h2>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="text-sm font-medium text-on-surface-variant">
                                        Yêu cầu xác thực email
                                    </label>
                                    <p className="text-xs text-on-surface-variant">
                                        Khi bật: Người dùng phải xác thực email trước khi đăng nhập<br/>
                                        Khi tắt: Người dùng có thể đăng nhập ngay sau khi đăng ký
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={formData.requireEmailVerification}
                                    onChange={(e) => setFormData({ ...formData, requireEmailVerification: e.target.checked })}
                                    className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary"
                                />
                            </div>

                            <div className="flex items-center justify-between border-t border-outline-variant pt-4">
                                <div>
                                    <label className="text-sm font-medium text-on-surface-variant">
                                        Cho phép chuyển xu giữa người dùng
                                    </label>
                                    <p className="text-xs text-on-surface-variant">
                                        Khi bật: Người dùng có thể chuyển xu cho nhau (không mất phí)<br />
                                        Khi tắt: Trang chuyển xu sẽ báo tính năng đang tắt
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={formData.allowCoinTransfer}
                                    onChange={(e) => setFormData({ ...formData, allowCoinTransfer: e.target.checked })}
                                    className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary"
                                />
                            </div>

                            {/* Phí donate nền tảng */}
                            <div className="border-t border-outline-variant pt-4">
                                <label className="text-sm font-medium text-on-surface-variant block mb-1">
                                    Phí nền tảng khi ủng hộ tác giả (%)
                                </label>
                                <p className="text-xs text-on-surface-variant mb-3">
                                    Tỷ lệ coin nền tảng giữ lại khi độc giả ủng hộ tác giả. Áp dụng cho mọi
                                    donation phát sinh kể từ thời điểm lưu — các donation cũ vẫn giữ nguyên mức phí
                                    của chúng. Đặt 0 để tác giả nhận 100%.
                                </p>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min={0}
                                        max={50}
                                        step={1}
                                        value={formData.donationPlatformFeePercent}
                                        onChange={(e) => {
                                            const v = parseInt(e.target.value, 10);
                                            setFormData({
                                                ...formData,
                                                donationPlatformFeePercent: Number.isNaN(v) ? 0 : Math.max(0, Math.min(50, v)),
                                            });
                                        }}
                                        className="w-28 px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                    />
                                    <span className="text-sm text-on-surface-variant">%</span>
                                    <span className="text-xs text-on-surface-variant ml-2">
                                        Ví dụ: donate 100 coin → tác giả nhận {Math.max(0, 100 - Math.ceil(100 * formData.donationPlatformFeePercent / 100))} coin · phí {Math.ceil(100 * formData.donationPlatformFeePercent / 100)} coin
                                    </span>
                                </div>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                                    Giới hạn 0–50%. Người ủng hộ không thấy con số này — chỉ tác giả mới biết.
                                </p>
                            </div>

                            {/* Phí bán chương / VIP nền tảng — tách riêng khỏi donate (spec mục 17) */}
                            <div className="border-t border-outline-variant pt-4">
                                <label className="text-sm font-medium text-on-surface-variant block mb-1">
                                    Phí nền tảng khi bán chương / truyện VIP (%)
                                </label>
                                <p className="text-xs text-on-surface-variant mb-3">
                                    Áp dụng riêng cho mua chương trả phí và mua truyện VIP. Tách khỏi phí ủng hộ
                                    để admin tinh chỉnh được mỗi loại. Các giao dịch mua trước thời điểm lưu vẫn giữ phí cũ.
                                </p>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min={0}
                                        max={50}
                                        step={1}
                                        value={formData.chapterSaleFeePercent}
                                        onChange={(e) => {
                                            const v = parseInt(e.target.value, 10);
                                            setFormData({
                                                ...formData,
                                                chapterSaleFeePercent: Number.isNaN(v) ? 0 : Math.max(0, Math.min(50, v)),
                                            });
                                        }}
                                        className="w-28 px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                    />
                                    <span className="text-sm text-on-surface-variant">%</span>
                                    <span className="text-xs text-on-surface-variant ml-2">
                                        Ví dụ: bán chương 100 coin → tác giả nhận {Math.max(0, 100 - Math.ceil(100 * formData.chapterSaleFeePercent / 100))} coin · phí {Math.ceil(100 * formData.chapterSaleFeePercent / 100)} coin
                                    </span>
                                </div>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                                    Giới hạn 0–50%. Người mua không thấy phí — chỉ thấy giá gross.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* === Thanh toán thủ công (chuyển khoản, admin xác nhận tay) === */}
                    <div className="bg-surface-container rounded-lg shadow-sm border border-outline-variant p-6 mt-6">
                        <h2 className="text-xl font-semibold text-on-surface mb-1">
                            Thanh toán thủ công (chuyển khoản)
                        </h2>
                        <p className="text-sm text-on-surface-variant mb-4">
                            Cho phép người dùng nạp xu bằng chuyển khoản ngân hàng. Hệ thống tạo mã QR VietQR +
                            mã tham chiếu; sau khi nhận được tiền, admin vào{' '}
                            <a href="/admin/payments" className="text-primary hover:underline">Duyệt nạp thủ công</a>{' '}
                            để xác nhận (kích hoạt bằng tay) — xu sẽ được cộng vào ví người dùng.
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="text-sm font-medium text-on-surface-variant">
                                        Bật thanh toán chuyển khoản
                                    </label>
                                    <p className="text-xs text-on-surface-variant">
                                        Khi bật, trang Cửa hàng sẽ hiện tuỳ chọn &quot;Chuyển khoản ngân hàng&quot;.
                                        Cần điền đủ thông tin ngân hàng bên dưới.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={formData.manualPaymentEnabled}
                                    onChange={(e) => setFormData({ ...formData, manualPaymentEnabled: e.target.checked })}
                                    className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-outline-variant pt-4">
                                <div>
                                    <label className="text-sm font-medium text-on-surface-variant block mb-1">
                                        Ngân hàng
                                    </label>
                                    <select
                                        value={formData.manualPaymentBankBin}
                                        onChange={(e) => {
                                            const bin = e.target.value;
                                            const bank = VN_BANKS.find((b) => b.bin === bin);
                                            setFormData({
                                                ...formData,
                                                manualPaymentBankBin: bin,
                                                manualPaymentBankName: bank ? bank.name : formData.manualPaymentBankName,
                                            });
                                        }}
                                        className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface"
                                    >
                                        <option value="">— Chọn ngân hàng —</option>
                                        {VN_BANKS.map((b) => (
                                            <option key={b.bin} value={b.bin}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-on-surface-variant block mb-1">
                                        Tên hiển thị ngân hàng
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.manualPaymentBankName}
                                        onChange={(e) => setFormData({ ...formData, manualPaymentBankName: e.target.value })}
                                        placeholder="Vietcombank"
                                        className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-on-surface-variant block mb-1">
                                        Số tài khoản
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={formData.manualPaymentAccountNumber}
                                        onChange={(e) => setFormData({ ...formData, manualPaymentAccountNumber: e.target.value.trim() })}
                                        placeholder="0123456789"
                                        className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-on-surface-variant block mb-1">
                                        Chủ tài khoản
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.manualPaymentAccountHolder}
                                        onChange={(e) => setFormData({ ...formData, manualPaymentAccountHolder: e.target.value })}
                                        placeholder="NGUYEN VAN A"
                                        className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant uppercase"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-on-surface-variant block mb-1">
                                    Ghi chú / hướng dẫn thêm (tuỳ chọn)
                                </label>
                                <textarea
                                    rows={2}
                                    value={formData.manualPaymentInstructions}
                                    onChange={(e) => setFormData({ ...formData, manualPaymentInstructions: e.target.value })}
                                    placeholder="Ví dụ: Sau khi chuyển khoản, xu sẽ được cộng trong vòng 5-30 phút giờ hành chính."
                                    className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                />
                            </div>

                            {/* Xem trước mã QR khi đã đủ thông tin */}
                            {formData.manualPaymentBankBin && formData.manualPaymentAccountNumber && (
                                <div className="border-t border-outline-variant pt-4">
                                    <p className="text-sm font-medium text-on-surface-variant mb-2">Xem trước mã QR</p>
                                    <div className="flex items-start gap-3">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={`https://img.vietqr.io/image/${encodeURIComponent(formData.manualPaymentBankBin)}-${encodeURIComponent(formData.manualPaymentAccountNumber)}-compact2.png?addInfo=${encodeURIComponent('NAP MAU')}&accountName=${encodeURIComponent(formData.manualPaymentAccountHolder || '')}`}
                                            alt="QR mẫu"
                                            className="w-44 h-auto rounded-lg border border-outline-variant bg-white"
                                            loading="lazy"
                                        />
                                        <p className="text-xs text-on-surface-variant max-w-xs">
                                            Đây là QR mẫu (chưa có số tiền). QR thật cho từng giao dịch sẽ tự điền
                                            số tiền + mã tham chiếu riêng của người dùng.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* === Cấu hình quảng cáo === */}
                    <div className="bg-surface-container rounded-lg shadow-sm border border-outline-variant p-6 mt-6">
                        <h2 className="text-xl font-semibold text-on-surface mb-4">Quảng cáo (Ads)</h2>
                        <p className="text-sm text-on-surface-variant mb-4">
                            Khi tắt <code>adsEnabled</code>, mọi ad placement trên web + mobile ẩn đi —
                            kill switch khẩn cấp. Publisher ID / App ID dùng để init SDK 3rd-party.
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="adsEnabled"
                                    checked={formData.adsEnabled}
                                    onChange={(e) => setFormData({ ...formData, adsEnabled: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                <label htmlFor="adsEnabled" className="text-sm font-medium text-on-surface">
                                    Bật hiển thị quảng cáo (global kill switch)
                                </label>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="consentRequired"
                                    checked={formData.consentRequired}
                                    onChange={(e) => setFormData({ ...formData, consentRequired: e.target.checked })}
                                    className="w-4 h-4"
                                />
                                <label htmlFor="consentRequired" className="text-sm font-medium text-on-surface">
                                    Yêu cầu user đồng ý (GDPR consent banner)
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-on-surface-variant mb-1">
                                        Google AdSense Publisher ID
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.googleAdsensePublisherId}
                                        onChange={(e) =>
                                            setFormData({ ...formData, googleAdsensePublisherId: e.target.value })
                                        }
                                        placeholder="ca-pub-1234567890123456"
                                        className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface font-mono text-sm"
                                    />
                                    <p className="text-xs text-on-surface-variant mt-1">
                                        Web — script load vào root layout, đọc ID này.
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-on-surface-variant mb-1">
                                        Facebook Audience Network App ID
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.fanPlacementId}
                                        onChange={(e) =>
                                            setFormData({ ...formData, fanPlacementId: e.target.value })
                                        }
                                        placeholder="1234567890123456"
                                        className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface font-mono text-sm"
                                    />
                                    <p className="text-xs text-on-surface-variant mt-1">Mobile — defer.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-on-surface-variant mb-1">
                                        AdMob Android App ID
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.admobAndroidAppId}
                                        onChange={(e) =>
                                            setFormData({ ...formData, admobAndroidAppId: e.target.value })
                                        }
                                        placeholder="ca-app-pub-XXXX~YYYY"
                                        className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface font-mono text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-on-surface-variant mb-1">
                                        AdMob iOS App ID
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.admobIosAppId}
                                        onChange={(e) =>
                                            setFormData({ ...formData, admobIosAppId: e.target.value })
                                        }
                                        placeholder="ca-app-pub-XXXX~YYYY"
                                        className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface font-mono text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                                    Nội dung ads.txt
                                </label>
                                <textarea
                                    value={formData.adsTxtContent}
                                    onChange={(e) =>
                                        setFormData({ ...formData, adsTxtContent: e.target.value })
                                    }
                                    rows={4}
                                    placeholder="google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0"
                                    className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface-container text-on-surface font-mono text-xs"
                                />
                                <p className="text-xs text-on-surface-variant mt-1">
                                    Serve qua <code>/ads.txt</code> cho Google AdSense verify. Mỗi dòng 1
                                    publisher.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* === Domain ảnh ngoài === */}
                    <div className="bg-surface-container rounded-lg shadow-sm border border-outline-variant p-6">
                        <h2 className="text-xl font-semibold text-on-surface mb-1">Domain ảnh ngoài (Image Domains)</h2>
                        <p className="text-sm text-on-surface-variant mb-4">
                            Danh sách hostname được phép hiển thị ảnh qua <code>/_next/image</code>.
                            Domain built-in (hardcode) luôn hoạt động; thêm domain mới vào đây sẽ lưu vào
                            database và có hiệu lực ngay lập tức — không cần rebuild.
                        </p>

                        {/* Built-in domains */}
                        <div className="mb-4">
                            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide mb-2">Built-in (không thể xóa)</p>
                            <div className="flex flex-wrap gap-2">
                                {BUILTIN_DOMAINS.map((d) => (
                                    <span key={d} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-surface-container-high text-on-surface-variant border border-outline-variant font-mono">
                                        {d}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Custom domains */}
                        <div className="mb-4">
                            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide mb-2">Thêm bởi admin</p>
                            {formData.allowedImageDomains.length === 0 ? (
                                <p className="text-sm text-on-surface-variant italic">Chưa có domain nào.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {formData.allowedImageDomains.map((domain) => (
                                        <span key={domain} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/30 font-mono">
                                            {domain}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setFormData({
                                                        ...formData,
                                                        allowedImageDomains: formData.allowedImageDomains.filter((d) => d !== domain),
                                                    })
                                                }
                                                className="ml-0.5 hover:text-error transition-colors"
                                                aria-label={`Xóa ${domain}`}
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add domain input */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value.trim().toLowerCase())}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const d = newDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
                                        if (d && !BUILTIN_DOMAINS.includes(d) && !formData.allowedImageDomains.includes(d)) {
                                            setFormData({ ...formData, allowedImageDomains: [...formData.allowedImageDomains, d] });
                                            setNewDomain('');
                                        }
                                    }
                                }}
                                placeholder="vd: i.pinimg.com"
                                className="flex-1 px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant font-mono text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const d = newDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
                                    if (d && !BUILTIN_DOMAINS.includes(d) && !formData.allowedImageDomains.includes(d)) {
                                        setFormData({ ...formData, allowedImageDomains: [...formData.allowedImageDomains, d] });
                                        setNewDomain('');
                                    }
                                }}
                                className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors text-sm"
                            >
                                Thêm
                            </button>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-2">
                            Chỉ nhập hostname, không cần <code>https://</code>. Nhấn Enter hoặc bấm Thêm.
                            Sau khi thêm, nhớ bấm <strong>Lưu cài đặt</strong> bên dưới.
                        </p>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSave}
                            disabled={updateMutation.isPending}
                            className="px-6 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {updateMutation.isPending ? 'Đang lưu...' : 'Lưu cài đặt'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
