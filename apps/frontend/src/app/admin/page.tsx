'use client';

import { useState } from 'react';
import { BarChart, LineChart, DoughnutChart } from '@/components/admin/charts';
import { RefreshButton } from '@/components/admin/refresh-button';
import { useAdminStatistics } from '@/lib/api/hooks/use-statistics';
import { Loading } from '@/components/ui/loading';
import * as XLSX from 'xlsx';

export default function AdminDashboardPage() {
    const { data: stats, isLoading } = useAdminStatistics();

    // Use real data or fallback to empty/default values
    const statsData = stats || {
        totalUsers: 0,
        totalStories: 0,
        totalChapters: 0,
        totalViews: 0,
        pendingApprovals: 0,
        activeAds: 0,
        userGrowth: [],
        userGrowthLabels: [],
        storyViews: [],
        storyViewsLabels: [],
    };

    const userGrowthData = statsData.userGrowth.length > 0
        ? statsData.userGrowth
        : [0, 0, 0, 0, 0, 0, 0];
    const userGrowthLabels = statsData.userGrowthLabels.length > 0
        ? statsData.userGrowthLabels
        : ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7'];

    const storyViewsData = statsData.storyViews.length > 0
        ? statsData.storyViews
        : [0, 0, 0, 0, 0, 0, 0];
    const storyViewsLabels = statsData.storyViewsLabels.length > 0
        ? statsData.storyViewsLabels
        : ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7'];

    const categoryData = statsData.categoryDistribution || { labels: [], data: [] };
    const roleData = statsData.userRoleDistribution || { labels: [], data: [] };
    const topStories = statsData.topStories || [];

    const handleExportExcel = () => {
        const wb = XLSX.utils.book_new();
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];

        // Dashboard Summary Sheet
        const summaryData = [
            ['BÁO CÁO TỔNG QUAN HỆ THỐNG'],
            ['Ngày xuất báo cáo', new Date().toLocaleString('vi-VN')],
            [''],
            ['THỐNG KÊ TỔNG QUAN'],
            ['Tổng người dùng', statsData.totalUsers],
            ['Tổng truyện', statsData.totalStories],
            ['Tổng chương', statsData.totalChapters],
            ['Tổng lượt xem', statsData.totalViews],
            ['Chương cần duyệt', statsData.pendingApprovals],
            ['Quảng cáo đang chạy', statsData.activeAds],
            [''],
            ['TĂNG TRƯỞNG NGƯỜI DÙNG THEO THÁNG'],
            ['Tháng', 'Số người dùng mới'],
            ...userGrowthLabels.map((label, idx) => [label, userGrowthData[idx]]),
            [''],
            ['LƯỢT XEM TRUYỆN THEO THÁNG'],
            ['Tháng', 'Tổng lượt xem'],
            ...storyViewsLabels.map((label, idx) => [label, storyViewsData[idx]]),
        ];

        const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
        ws1['!cols'] = [
            { wch: 30 },
            { wch: 20 },
        ];
        XLSX.utils.book_append_sheet(wb, ws1, 'Tổng quan');

        // Category Distribution Sheet
        if (categoryData.labels.length > 0) {
            const categorySheetData = [
                ['PHÂN BỐ THEO THỂ LOẠI'],
                ['Thể loại', 'Số truyện'],
                ...categoryData.labels.map((label, idx) => [label, categoryData.data[idx]]),
            ];
            const ws2 = XLSX.utils.aoa_to_sheet(categorySheetData);
            ws2['!cols'] = [
                { wch: 25 },
                { wch: 15 },
            ];
            XLSX.utils.book_append_sheet(wb, ws2, 'Thể loại');
        }

        // User Role Distribution Sheet
        if (roleData.labels.length > 0) {
            const roleSheetData = [
                ['PHÂN BỐ THEO VAI TRÒ'],
                ['Vai trò', 'Số lượng'],
                ...roleData.labels.map((label, idx) => [label, roleData.data[idx]]),
            ];
            const ws3 = XLSX.utils.aoa_to_sheet(roleSheetData);
            ws3['!cols'] = [
                { wch: 20 },
                { wch: 15 },
            ];
            XLSX.utils.book_append_sheet(wb, ws3, 'Vai trò');
        }

        // Top Stories Sheet
        if (topStories.length > 0) {
            const topStoriesData = [
                ['TOP TRUYỆN XEM NHIỀU NHẤT'],
                ['STT', 'Tiêu đề', 'Tác giả', 'Lượt xem', 'Ngày tạo'],
                ...topStories.map((story, idx) => [
                    idx + 1,
                    story.title,
                    story.authorName,
                    story.viewCount,
                    new Date(story.createdAt).toLocaleDateString('vi-VN'),
                ]),
            ];
            const ws4 = XLSX.utils.aoa_to_sheet(topStoriesData);
            ws4['!cols'] = [
                { wch: 5 },
                { wch: 40 },
                { wch: 20 },
                { wch: 15 },
                { wch: 15 },
            ];
            XLSX.utils.book_append_sheet(wb, ws4, 'Top truyện');
        }

        XLSX.writeFile(wb, `dashboard_report_${dateStr}.xlsx`);
    };

    if (isLoading) {
        return (
            <>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loading />
                </div>
            </>
        );
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Dashboard</h1>
                        <p className="text-sm sm:text-base text-on-surface-variant mt-1 sm:mt-2">Tổng quan về hệ thống</p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={handleExportExcel}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                            title="Xuất báo cáo Excel"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            <span className="hidden sm:inline">Xuất Excel</span>
                        </button>
                        <RefreshButton queryKeys={[['admin', 'statistics']]} />
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="bg-surface-container rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-transparent hover:border-blue-200 dark:hover:border-blue-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-on-surface-variant">Tổng người dùng</p>
                                <p className="text-3xl font-bold text-on-surface mt-2">{statsData.totalUsers.toLocaleString()}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface-container rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-transparent hover:border-green-200 dark:hover:border-green-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-on-surface-variant">Tổng truyện</p>
                                <p className="text-3xl font-bold text-on-surface mt-2">{statsData.totalStories.toLocaleString()}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600 dark:text-green-400">
                                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface-container rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-transparent hover:border-purple-200 dark:hover:border-purple-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-on-surface-variant">Tổng lượt xem</p>
                                <p className="text-3xl font-bold text-on-surface mt-2">{statsData.totalViews.toLocaleString()}</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-600 dark:text-purple-400">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface-container rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-transparent hover:border-yellow-200 dark:hover:border-yellow-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-on-surface-variant">Chương cần duyệt</p>
                                <p className="text-3xl font-bold text-on-surface mt-2">{statsData.pendingApprovals}</p>
                            </div>
                            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-600 dark:text-yellow-400">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface-container rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-on-surface-variant">Quảng cáo đang chạy</p>
                                <p className="text-3xl font-bold text-on-surface mt-2">{statsData.activeAds}</p>
                            </div>
                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-600 dark:text-indigo-400">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <path d="M3 9h18" />
                                    <path d="M9 21V9" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface-container rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-transparent hover:border-red-200 dark:hover:border-red-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-on-surface-variant">Tổng chương</p>
                                <p className="text-3xl font-bold text-on-surface mt-2">{statsData.totalChapters.toLocaleString()}</p>
                            </div>
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600 dark:text-red-400">
                                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <LineChart data={userGrowthData} labels={userGrowthLabels} title="Tăng trưởng người dùng" color="#3b82f6" />
                    <BarChart data={storyViewsData} labels={storyViewsLabels} title="Lượt xem truyện theo tháng" color="#10b981" />
                    {categoryData.labels.length > 0 && (
                        <DoughnutChart
                            data={categoryData.data}
                            labels={categoryData.labels}
                            title="Phân bố theo thể loại"
                            color="#8b5cf6"
                        />
                    )}
                    {roleData.labels.length > 0 && (
                        <DoughnutChart
                            data={roleData.data}
                            labels={roleData.labels}
                            title="Phân bố theo vai trò"
                            color="#f59e0b"
                        />
                    )}
                </div>

                {/* Top Stories */}
                {topStories.length > 0 && (
                    <div className="bg-surface-container rounded-lg p-6 shadow-sm">
                        <h2 className="text-xl font-bold text-on-surface mb-4">Top truyện xem nhiều nhất</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-surface-container-low">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">STT</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Tiêu đề</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Tác giả</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Lượt xem</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-on-surface-variant uppercase tracking-wider">Ngày tạo</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-surface-container divide-y divide-outline-variant">
                                    {topStories.map((story, idx) => (
                                        <tr key={story.id} className="hover:bg-surface-container-high transition-colors">
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-on-surface">
                                                {idx + 1}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-on-surface">
                                                {story.title}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-on-surface-variant">
                                                {story.authorName}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-on-surface-variant">
                                                {story.viewCount.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-on-surface-variant">
                                                {new Date(story.createdAt).toLocaleDateString('vi-VN')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

