'use client';

import { AdminLayout } from '@/components/layouts/admin-layout';
import { useState } from 'react';

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState({
        siteName: 'Web Truyen Tien Hung',
        siteDescription: 'Nền tảng đọc truyện online',
        maintenanceMode: false,
        allowRegistration: true,
        requireEmailVerification: false,
    });

    const handleSave = () => {
        // Fake save
        alert('Đã lưu cài đặt');
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cài đặt</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Cấu hình hệ thống</p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Tên website
                        </label>
                        <input
                            type="text"
                            value={settings.siteName}
                            onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Mô tả website
                        </label>
                        <textarea
                            value={settings.siteDescription}
                            onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Chế độ bảo trì
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Tắt website để bảo trì</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.maintenanceMode}
                                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Cho phép đăng ký
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Cho phép người dùng mới đăng ký</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.allowRegistration}
                                onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Yêu cầu xác thực email
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Yêu cầu người dùng xác thực email</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.requireEmailVerification}
                                onChange={(e) => setSettings({ ...settings, requireEmailVerification: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                        >
                            Lưu cài đặt
                        </button>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

