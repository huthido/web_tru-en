'use client';

import { AdminLayout } from '@/components/layouts/admin-layout';
import { RefreshButton } from '@/components/admin/refresh-button';
import { useState, useRef, useEffect } from 'react';
import { useSettings, useUpdateSettings, useUploadLogo, useUploadFavicon } from '@/lib/api/hooks/use-settings';
import { useToast } from '@/components/ui/toast';
import { Loading } from '@/components/ui/loading';
import Image from 'next/image';

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
        allowCoinTransfer: false,
    });

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
                allowCoinTransfer: settings.allowCoinTransfer || false,
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
            <AdminLayout>
                <Loading />
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Cài đặt</h1>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">Cấu hình hệ thống</p>
                    </div>
                    <RefreshButton />
                </div>

                <div className="space-y-6">
                    {/* Thông tin cơ bản */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Thông tin cơ bản</h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Tên website
                            </label>
                            <input
                                type="text"
                                value={formData.siteName}
                                onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Mô tả website
                            </label>
                            <textarea
                                value={formData.siteDescription}
                                onChange={(e) => setFormData({ ...formData, siteDescription: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Logo website
                                </label>
                                <div className="space-y-3">
                                    {formData.siteLogo && (
                                        <div className="relative w-32 h-32 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
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
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => logoInputRef.current?.click()}
                                        disabled={uploadLogoMutation.isPending}
                                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        {uploadLogoMutation.isPending ? 'Đang tải...' : formData.siteLogo ? 'Thay đổi logo' : 'Tải logo lên'}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Favicon
                                </label>
                                <div className="space-y-3">
                                    {formData.siteFavicon && (
                                        <div className="relative w-16 h-16 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
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
                                        accept="image/*"
                                        onChange={handleFaviconUpload}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => faviconInputRef.current?.click()}
                                        disabled={uploadFaviconMutation.isPending}
                                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                                    >
                                        {uploadFaviconMutation.isPending ? 'Đang tải...' : formData.siteFavicon ? 'Thay đổi favicon' : 'Tải favicon lên'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Thông tin liên hệ */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Thông tin liên hệ</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.siteEmail}
                                    onChange={(e) => setFormData({ ...formData, siteEmail: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Số điện thoại
                                </label>
                                <input
                                    type="tel"
                                    value={formData.sitePhone}
                                    onChange={(e) => setFormData({ ...formData, sitePhone: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Địa chỉ
                            </label>
                            <textarea
                                value={formData.siteAddress}
                                onChange={(e) => setFormData({ ...formData, siteAddress: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    </div>

                    {/* Mạng xã hội */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mạng xã hội</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Facebook URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.siteFacebook}
                                    onChange={(e) => setFormData({ ...formData, siteFacebook: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="https://facebook.com/..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Twitter URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.siteTwitter}
                                    onChange={(e) => setFormData({ ...formData, siteTwitter: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="https://twitter.com/..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    X (Twitter) URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.siteX}
                                    onChange={(e) => setFormData({ ...formData, siteX: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="https://x.com/..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    YouTube URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.siteYoutube}
                                    onChange={(e) => setFormData({ ...formData, siteYoutube: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="https://youtube.com/..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Instagram URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.siteInstagram}
                                    onChange={(e) => setFormData({ ...formData, siteInstagram: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="https://instagram.com/..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    TikTok URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.siteTikTok}
                                    onChange={(e) => setFormData({ ...formData, siteTikTok: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="https://tiktok.com/@..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    LinkedIn URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.siteLinkedIn}
                                    onChange={(e) => setFormData({ ...formData, siteLinkedIn: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="https://linkedin.com/company/..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Threads URL
                                </label>
                                <input
                                    type="url"
                                    value={formData.siteThreads}
                                    onChange={(e) => setFormData({ ...formData, siteThreads: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    placeholder="https://threads.net/@..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Cài đặt hệ thống */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm space-y-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cài đặt hệ thống</h2>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Yêu cầu xác thực email
                                    </label>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Khi bật: Người dùng phải xác thực email trước khi đăng nhập<br/>
                                        Khi tắt: Người dùng có thể đăng nhập ngay sau khi đăng ký
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={formData.requireEmailVerification}
                                    onChange={(e) => setFormData({ ...formData, requireEmailVerification: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Cho phép chuyển xu giữa người dùng
                                    </label>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Khi bật: Người dùng có thể chuyển xu cho nhau (không mất phí)<br />
                                        Khi tắt: Trang chuyển xu sẽ báo tính năng đang tắt
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={formData.allowCoinTransfer}
                                    onChange={(e) => setFormData({ ...formData, allowCoinTransfer: e.target.checked })}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                            </div>

                            {/* Phí donate nền tảng */}
                            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                                    Phí nền tảng khi ủng hộ tác giả (%)
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
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
                                        className="w-28 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    />
                                    <span className="text-sm text-gray-500 dark:text-gray-400">%</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                        Ví dụ: donate 100 coin → tác giả nhận {Math.max(0, 100 - Math.ceil(100 * formData.donationPlatformFeePercent / 100))} coin · phí {Math.ceil(100 * formData.donationPlatformFeePercent / 100)} coin
                                    </span>
                                </div>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                                    Giới hạn 0–50%. Người ủng hộ không thấy con số này — chỉ tác giả mới biết.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSave}
                            disabled={updateMutation.isPending}
                            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {updateMutation.isPending ? 'Đang lưu...' : 'Lưu cài đặt'}
                        </button>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
