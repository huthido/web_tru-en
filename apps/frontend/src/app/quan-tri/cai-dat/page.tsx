'use client';

import { RefreshButton } from '@/components/admin/refresh-button';
import { useState, useRef, useEffect } from 'react';
import { useSettings, useUpdateSettings, useUploadLogo, useUploadFavicon, useUploadFooterBanner } from '@/lib/api/hooks/use-settings';
import { useToast } from '@/components/ui/toast';
import { Loading } from '@/components/ui/loading';
import Image from 'next/image';
import { isUsableImageSrc } from '@/utils/image-utils';
import type { TtsSubscriptionPlan, FooterBannerSlide } from '@/lib/api/settings.service';

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

const SETTINGS_TABS = [
    { id: 'basic', label: 'Cơ bản' },
    { id: 'contact', label: 'Liên hệ' },
    { id: 'social', label: 'Mạng xã hội' },
    { id: 'footer', label: 'Footer' },
    { id: 'system', label: 'Hệ thống' },
    { id: 'tts', label: 'Giọng đọc AI & phí' },
    { id: 'payment', label: 'Thanh toán' },
    { id: 'ads', label: 'Quảng cáo' },
    { id: 'domains', label: 'Domain ảnh' },
] as const;
type SettingsTabId = (typeof SETTINGS_TABS)[number]['id'];

export default function AdminSettingsPage() {
    const { data: settings, isLoading } = useSettings();
    const updateMutation = useUpdateSettings();
    const uploadLogoMutation = useUploadLogo();
    const uploadFaviconMutation = useUploadFavicon();
    const uploadFooterBannerMutation = useUploadFooterBanner();
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
        // --- Footer / Banner ---
        footerBannerEnabled: false,
        footerBannerImage: '',
        footerBannerLink: '',
        footerBannerSlides: [] as FooterBannerSlide[],
        requireEmailVerification: false,
        donationPlatformFeePercent: 2,
        chapterSaleFeePercent: 2,
        itemSaleFeePercent: 2,
        allowCoinTransfer: false,
        chapterAudioDownloadEnabled: false,
        copyProtectionEnabled: true,
        // --- Giọng đọc AI ---
        ttsAutoGenerateOnPublish: false,
        ttsSubscriptionPlans: [] as TtsSubscriptionPlan[],
        // --- Thanh toán thủ công (chuyển khoản) ---
        vnpayPaymentEnabled: true,
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
    // Mức giá gói giọng đọc AI đang nhập (số tháng + xu) — bấm "Thêm mức" để đưa vào bảng giá.
    const [newPlan, setNewPlan] = useState<{ months: string; coins: string }>({ months: '1', coins: '' });
    const addTtsPlan = () => {
        const months = parseInt(newPlan.months, 10);
        const coins = parseInt(newPlan.coins, 10);
        if (!Number.isInteger(months) || months < 1 || months > 36 || !Number.isInteger(coins) || coins < 0) return;
        const plans = formData.ttsSubscriptionPlans.filter((p) => p.months !== months);
        plans.push({ months, coins });
        plans.sort((a, b) => a.months - b.months);
        setFormData({ ...formData, ttsSubscriptionPlans: plans });
        setNewPlan({ months: String(Math.min(36, months + 1)), coins: '' });
    };
    // Tab đang mở — nhớ qua hash URL (#payment) để reload/ chia sẻ link vào đúng tab.
    const [activeTab, setActiveTab] = useState<SettingsTabId>('basic');
    useEffect(() => {
        const h = window.location.hash.replace('#', '');
        if (SETTINGS_TABS.some((t) => t.id === h)) setActiveTab(h as SettingsTabId);
    }, []);
    const switchTab = (id: SettingsTabId) => {
        setActiveTab(id);
        window.history.replaceState(null, '', `#${id}`);
    };

    // Snapshot form đã lưu — so với formData để báo "chưa lưu" + chặn rời trang.
    const savedSnapshotRef = useRef<string>('');
    const dirty = savedSnapshotRef.current !== '' && JSON.stringify(formData) !== savedSnapshotRef.current;
    useEffect(() => {
        if (!dirty) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [dirty]);

    const logoInputRef = useRef<HTMLInputElement>(null);
    const faviconInputRef = useRef<HTMLInputElement>(null);
    const footerBannerInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (settings) {
            const loaded = {
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
                footerBannerEnabled: (settings as any).footerBannerEnabled ?? false,
                footerBannerImage: (settings as any).footerBannerImage || '',
                footerBannerLink: (settings as any).footerBannerLink || '',
                // Slides: dùng mảng nếu có; nếu rỗng mà còn ảnh đơn cũ thì chuyển thành 1 slide.
                footerBannerSlides: Array.isArray((settings as any).footerBannerSlides) && (settings as any).footerBannerSlides.length > 0
                    ? (settings as any).footerBannerSlides
                    : ((settings as any).footerBannerImage
                        ? [{ image: (settings as any).footerBannerImage, link: (settings as any).footerBannerLink || '' }]
                        : []),
                requireEmailVerification: settings.requireEmailVerification || false,
                donationPlatformFeePercent: settings.donationPlatformFeePercent ?? 2,
                chapterSaleFeePercent: settings.chapterSaleFeePercent ?? 2,
                itemSaleFeePercent: (settings as any).itemSaleFeePercent ?? 2,
                allowCoinTransfer: settings.allowCoinTransfer || false,
                chapterAudioDownloadEnabled: (settings as any).chapterAudioDownloadEnabled ?? false,
                copyProtectionEnabled: (settings as any).copyProtectionEnabled ?? true,
                ttsAutoGenerateOnPublish: (settings as any).ttsAutoGenerateOnPublish ?? false,
                ttsSubscriptionPlans: Array.isArray((settings as any).ttsSubscriptionPlans)
                    ? (settings as any).ttsSubscriptionPlans
                    : [],
                vnpayPaymentEnabled: (settings as any).vnpayPaymentEnabled ?? true,
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
            };
            setFormData(loaded);
            savedSnapshotRef.current = JSON.stringify(loaded);
        }
    }, [settings]);

    const handleSave = async () => {
        try {
            await updateMutation.mutateAsync(formData);
            savedSnapshotRef.current = JSON.stringify(formData);
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

    const handleFooterBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // reset input để chọn lại cùng 1 file vẫn kích hoạt onChange
        if (e.target) e.target.value = '';
        if (!file) return;

        try {
            const url = await uploadFooterBannerMutation.mutateAsync(file);
            setFormData((prev) => ({
                ...prev,
                footerBannerSlides: [...prev.footerBannerSlides, { image: url, link: '' }],
            }));
            showToast('Đã thêm ảnh banner', 'success');
        } catch (error: any) {
            showToast(error?.response?.data?.error || 'Có lỗi xảy ra khi tải banner', 'error');
        }
    };

    const removeBannerSlide = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            footerBannerSlides: prev.footerBannerSlides.filter((_, i) => i !== index),
        }));
    };

    const updateBannerSlideLink = (index: number, link: string) => {
        setFormData((prev) => ({
            ...prev,
            footerBannerSlides: prev.footerBannerSlides.map((s, i) => (i === index ? { ...s, link } : s)),
        }));
    };

    const moveBannerSlide = (index: number, dir: -1 | 1) => {
        setFormData((prev) => {
            const arr = [...prev.footerBannerSlides];
            const j = index + dir;
            if (j < 0 || j >= arr.length) return prev;
            [arr[index], arr[j]] = [arr[j], arr[index]];
            return { ...prev, footerBannerSlides: arr };
        });
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
                {/* Hàng tiêu đề dính trên (sticky top): nút Lưu cài đặt + Làm mới luôn hiện ở mọi tab / vị trí cuộn.
                    Margin âm bù padding của <main> để nền phủ hết chiều ngang khi cuộn. */}
                <div className="sticky top-0 z-20 -mx-3 sm:-mx-4 md:-mx-6 -mt-3 sm:-mt-4 md:-mt-6 px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6 pb-3 bg-surface/95 backdrop-blur border-b border-outline-variant flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Cài đặt</h1>
                        <p className={`text-sm sm:text-base mt-1 ${dirty ? 'text-amber-700 dark:text-amber-400 font-medium' : 'text-on-surface-variant'}`}>
                            {dirty ? 'Có thay đổi chưa lưu — Lưu sẽ áp dụng cho mọi tab' : 'Cấu hình hệ thống'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={updateMutation.isPending}
                            className="px-5 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            {updateMutation.isPending ? 'Đang lưu...' : 'Lưu cài đặt'}
                        </button>
                        <RefreshButton />
                    </div>
                </div>

                {/* Thanh tab — mỗi nhóm cài đặt một tab; dữ liệu form giữ chung nên đổi tab không mất thay đổi */}
                <div className="flex gap-1 overflow-x-auto border-b border-outline-variant -mb-2 pb-px" role="tablist" aria-label="Nhóm cài đặt">
                    {SETTINGS_TABS.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === t.id}
                            onClick={() => switchTab(t.id)}
                            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
                                activeTab === t.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="space-y-6">
                    {activeTab === 'basic' && (
                        <>
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
                        </>
                    )}

                    {activeTab === 'contact' && (
                        <>
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
                        </>
                    )}

                    {activeTab === 'social' && (
                        <>
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
                        </>
                    )}

                    {activeTab === 'footer' && (
                        <>
                    <div className="bg-surface-container rounded-lg p-6 shadow-sm space-y-6">
                        <h2 className="text-xl font-bold text-on-surface">Footer / Banner</h2>
                        <p className="text-sm text-on-surface-variant">
                            Footer hiện chỉ hiển thị ở <b>trang cá nhân</b> (/u/tên-người-dùng). Bật tuỳ chọn
                            dưới đây để thay hẳn footer bằng một ảnh banner.
                        </p>

                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-on-surface-variant">
                                    Thay footer bằng banner ảnh
                                </label>
                                <p className="text-xs text-on-surface-variant">
                                    Khi bật: khu footer hiển thị 1 ảnh banner thay cho các cột liên kết<br />
                                    Khi tắt: hiển thị footer thường (logo + liên kết + mạng xã hội)
                                </p>
                            </div>
                            <input
                                type="checkbox"
                                checked={formData.footerBannerEnabled}
                                onChange={(e) => setFormData({ ...formData, footerBannerEnabled: e.target.checked })}
                                className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary"
                            />
                        </div>

                        <div className="border-t border-outline-variant pt-6">
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-on-surface-variant">
                                    Ảnh banner (slideshow)
                                </label>
                                <span className="text-xs text-on-surface-variant">{formData.footerBannerSlides.length} ảnh</span>
                            </div>

                            <div className="space-y-3">
                                {formData.footerBannerSlides.map((slide, i) => (
                                    <div key={i} className="flex flex-col sm:flex-row gap-3 p-3 border border-outline-variant rounded-lg">
                                        {isUsableImageSrc(slide.image) && (
                                            <div className="relative w-full sm:w-40 h-24 flex-shrink-0 border border-outline-variant rounded overflow-hidden bg-surface-variant">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={slide.image} alt={`Ảnh ${i + 1}`} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0 space-y-2">
                                            <input
                                                type="url"
                                                value={slide.link || ''}
                                                onChange={(e) => updateBannerSlideLink(i, e.target.value)}
                                                placeholder="Link khi bấm (tuỳ chọn) https://..."
                                                className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                            />
                                            <div className="flex items-center gap-2 text-sm">
                                                <button type="button" onClick={() => moveBannerSlide(i, -1)} disabled={i === 0}
                                                    className="px-2.5 py-1 rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40" aria-label="Lên">↑</button>
                                                <button type="button" onClick={() => moveBannerSlide(i, 1)} disabled={i === formData.footerBannerSlides.length - 1}
                                                    className="px-2.5 py-1 rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40" aria-label="Xuống">↓</button>
                                                <button type="button" onClick={() => removeBannerSlide(i)}
                                                    className="px-2.5 py-1 rounded border border-error/40 text-error hover:bg-error/10 ml-auto">Xoá</button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {formData.footerBannerSlides.length === 0 && (
                                    <p className="text-sm text-on-surface-variant">Chưa có ảnh nào. Bấm &quot;Thêm ảnh&quot; để tải lên.</p>
                                )}

                                <input
                                    ref={footerBannerInputRef}
                                    type="file"
                                    accept="image/*,.heic,.heif"
                                    onChange={handleFooterBannerUpload}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => footerBannerInputRef.current?.click()}
                                    disabled={uploadFooterBannerMutation.isPending}
                                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    {uploadFooterBannerMutation.isPending ? 'Đang tải...' : '+ Thêm ảnh'}
                                </button>
                                <p className="text-xs text-on-surface-variant">
                                    Nên dùng ảnh ngang, cùng kích thước (khuyến nghị ≥ 1200px). Nhiều ảnh sẽ tự chạy slideshow ở đáy các trang. Tối đa 5MB/ảnh. Nhớ bấm &quot;Lưu cài đặt&quot;.
                                </p>
                            </div>
                        </div>
                    </div>
                        </>
                    )}

                    {activeTab === 'system' && (
                        <>
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

                            <div className="flex items-center justify-between border-t border-outline-variant pt-4">
                                <div>
                                    <label className="text-sm font-medium text-on-surface-variant">
                                        Cho phép tải xuống audio chương
                                    </label>
                                    <p className="text-xs text-on-surface-variant">
                                        Khi bật: Player audio (tác giả tải lên / giọng đọc AI) hiện nút tải xuống<br />
                                        Khi tắt: Ẩn nút tải xuống và menu chuột phải trên player (chặn mềm)
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={formData.chapterAudioDownloadEnabled}
                                    onChange={(e) => setFormData({ ...formData, chapterAudioDownloadEnabled: e.target.checked })}
                                    className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary"
                                />
                            </div>

                            <div className="flex items-center justify-between border-t border-outline-variant pt-4">
                                <div>
                                    <label className="text-sm font-medium text-on-surface-variant">
                                        Chống copy nội dung truyện
                                    </label>
                                    <p className="text-xs text-on-surface-variant">
                                        Khi bật: Trang đọc chặn bôi đen, copy, chuột phải, kéo thả trên nội dung chương
                                        (tác giả truyện và admin không bị chặn)<br />
                                        Khi tắt: Độc giả copy nội dung bình thường
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={formData.copyProtectionEnabled}
                                    onChange={(e) => setFormData({ ...formData, copyProtectionEnabled: e.target.checked })}
                                    className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary"
                                />
                            </div>
                        </div>
                    </div>
                        </>
                    )}

                    {activeTab === 'tts' && (
                        <>
                    {/* Giọng đọc AI & phí nền tảng */}
                    <div className="bg-surface-container rounded-lg p-6 shadow-sm space-y-6">
                        <h2 className="text-xl font-bold text-on-surface">Giọng đọc AI &amp; phí nền tảng</h2>

                        <div className="space-y-4">
                            {/* Giọng đọc AI: tự tạo khi xuất bản */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="text-sm font-medium text-on-surface-variant">
                                        Tự tạo giọng đọc AI khi xuất bản chương
                                    </label>
                                    <p className="text-xs text-on-surface-variant">
                                        Khi bật: Mỗi chương miễn phí vừa xuất bản được tự xếp hàng tạo audio AI (không trừ xu tác giả)<br />
                                        Khi tắt: Chỉ tạo khi tác giả/admin bấm &quot;Tạo giọng AI&quot; ở trang quản lý chương
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={formData.ttsAutoGenerateOnPublish}
                                    onChange={(e) => setFormData({ ...formData, ttsAutoGenerateOnPublish: e.target.checked })}
                                    className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary"
                                />
                            </div>

                            {/* Giọng đọc AI: bảng giá gói tháng */}
                            <div className="border-t border-outline-variant pt-4">
                                <label className="text-sm font-medium text-on-surface-variant block mb-1">
                                    Bảng giá gói giọng đọc AI (xu theo số tháng)
                                </label>
                                <p className="text-xs text-on-surface-variant mb-3">
                                    Tác giả chọn một mức (vd 1 tháng 10.000 xu · 2 tháng 15.000 xu · 3 tháng 20.000 xu)
                                    rồi tự tạo giọng đọc AI cho mọi chương miễn phí không giới hạn trong thời hạn
                                    (1 tháng = 30 ngày, gia hạn cộng dồn). Không có mức nào = miễn phí cho mọi tác giả.
                                    Admin không cần gói. Đổi giá không ảnh hưởng gói đã mua.
                                </p>
                                {formData.ttsSubscriptionPlans.length === 0 ? (
                                    <p className="text-sm text-on-surface-variant italic mb-3">
                                        Chưa có mức giá nào — giọng đọc AI đang miễn phí cho tác giả.
                                    </p>
                                ) : (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {formData.ttsSubscriptionPlans.map((plan) => (
                                            <span
                                                key={plan.months}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-primary/10 text-primary border border-primary/30"
                                            >
                                                <span className="font-semibold">{plan.months} tháng</span>
                                                <span className="text-on-surface-variant">·</span>
                                                <span>{plan.coins.toLocaleString('vi-VN')} xu</span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setFormData({
                                                            ...formData,
                                                            ttsSubscriptionPlans: formData.ttsSubscriptionPlans.filter(
                                                                (p) => p.months !== plan.months,
                                                            ),
                                                        })
                                                    }
                                                    className="ml-0.5 hover:text-error transition-colors"
                                                    aria-label={`Xóa mức ${plan.months} tháng`}
                                                >
                                                    ✕
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="flex flex-wrap items-end gap-2">
                                    <div>
                                        <label className="block text-xs text-on-surface-variant mb-1">Số tháng</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={36}
                                            step={1}
                                            value={newPlan.months}
                                            onChange={(e) => setNewPlan({ ...newPlan, months: e.target.value })}
                                            className="w-24 px-3 py-2 border border-outline-variant rounded-lg bg-surface text-on-surface focus:ring-2 focus:ring-primary focus:border-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-on-surface-variant mb-1">Giá (xu)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            step={1}
                                            value={newPlan.coins}
                                            onChange={(e) => setNewPlan({ ...newPlan, coins: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addTtsPlan();
                                                }
                                            }}
                                            placeholder="vd: 10000"
                                            className="w-36 px-3 py-2 border border-outline-variant rounded-lg bg-surface text-on-surface focus:ring-2 focus:ring-primary focus:border-primary"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addTtsPlan}
                                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Thêm mức
                                    </button>
                                </div>
                                <p className="text-xs text-on-surface-variant mt-2">
                                    Thêm mức có cùng số tháng sẽ thay giá cũ. Nhớ bấm Lưu cài đặt.
                                </p>
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

                            {/* Phí bán vật phẩm của truyện — tách riêng khỏi phí chương/ủng hộ */}
                            <div className="border-t border-outline-variant pt-4">
                                <label className="text-sm font-medium text-on-surface-variant block mb-1">
                                    Phí nền tảng khi bán vật phẩm của truyện (%)
                                </label>
                                <p className="text-xs text-on-surface-variant mb-3">
                                    Áp dụng khi người mua giao dịch xu mua vật phẩm với tác giả. Tách riêng để
                                    admin chỉnh độc lập. Các giao dịch trước thời điểm lưu vẫn giữ phí cũ.
                                </p>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min={0}
                                        max={50}
                                        step={1}
                                        value={formData.itemSaleFeePercent}
                                        onChange={(e) => {
                                            const v = parseInt(e.target.value, 10);
                                            setFormData({
                                                ...formData,
                                                itemSaleFeePercent: Number.isNaN(v) ? 0 : Math.max(0, Math.min(50, v)),
                                            });
                                        }}
                                        className="w-28 px-3 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-container text-on-surface placeholder:text-on-surface-variant"
                                    />
                                    <span className="text-sm text-on-surface-variant">%</span>
                                    <span className="text-xs text-on-surface-variant ml-2">
                                        Ví dụ: bán vật phẩm 100 xu → tác giả nhận {Math.max(0, 100 - Math.ceil(100 * formData.itemSaleFeePercent / 100))} xu · phí {Math.ceil(100 * formData.itemSaleFeePercent / 100)} xu
                                    </span>
                                </div>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                                    Giới hạn 0–50%. Người mua không thấy phí — chỉ thấy giá gross.
                                </p>
                            </div>
                        </div>
                    </div>
                        </>
                    )}

                    {activeTab === 'payment' && (
                        <>
                    {/* === Thanh toán thủ công (chuyển khoản, admin xác nhận tay) === */}
                    <div className="bg-surface-container rounded-lg shadow-sm border border-outline-variant p-6">
                        <h2 className="text-xl font-semibold text-on-surface mb-1">
                            Thanh toán thủ công (chuyển khoản)
                        </h2>
                        <p className="text-sm text-on-surface-variant mb-4">
                            Cho phép người dùng nạp xu bằng chuyển khoản ngân hàng. Hệ thống tạo mã QR VietQR +
                            mã tham chiếu; sau khi nhận được tiền, admin vào{' '}
                            <a href="/quan-tri/thanh-toan" className="text-primary hover:underline">Duyệt nạp thủ công</a>{' '}
                            để xác nhận (kích hoạt bằng tay) — xu sẽ được cộng vào ví người dùng.
                        </p>
                        <div className="space-y-4">
                            {/* Hình thức thanh toán: ẩn/hiện cổng VNPay */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="text-sm font-medium text-on-surface-variant">
                                        Hiện cổng VNPay trong Hình thức thanh toán
                                    </label>
                                    <p className="text-xs text-on-surface-variant">
                                        Tắt khi chưa cấu hình VNPay: Cửa hàng ẩn tuỳ chọn &quot;Cổng VNPay&quot; và chỉ còn
                                        chuyển khoản (nếu bật bên dưới). Bộ chọn &quot;Hình thức thanh toán&quot; chỉ hiện khi
                                        có từ 2 hình thức trở lên; tắt cả hai thì Cửa hàng báo tạm đóng nạp xu.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={formData.vnpayPaymentEnabled}
                                    onChange={(e) => setFormData({ ...formData, vnpayPaymentEnabled: e.target.checked })}
                                    className="w-4 h-4 text-primary border-outline-variant rounded focus:ring-primary"
                                />
                            </div>

                            <div className="flex items-center justify-between border-t border-outline-variant pt-4">
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
                        </>
                    )}

                    {activeTab === 'ads' && (
                        <>
                    {/* === Cấu hình quảng cáo === */}
                    <div className="bg-surface-container rounded-lg shadow-sm border border-outline-variant p-6">
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
                        </>
                    )}

                    {activeTab === 'domains' && (
                        <>
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
                            Sau khi thêm, nhớ bấm <strong>Lưu cài đặt</strong> ở góc trên.
                        </p>
                    </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
