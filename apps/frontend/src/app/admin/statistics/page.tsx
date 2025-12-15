'use client';

import { AdminLayout } from '@/components/layouts/admin-layout';
import { BarChart } from '@/components/admin/charts';

export default function AdminStatisticsPage() {
    // Fake statistics data
    const stats = {
        totalUsers: 1250,
        activeUsers: 850,
        totalStories: 450,
        totalChapters: 3200,
        totalViews: 125000,
        totalComments: 5600,
        totalLikes: 8500,
        totalFollows: 3200,
    };

    const userGrowthData = [120, 135, 150, 180, 200, 250, 300];
    const userGrowthLabels = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7'];

    const viewsData = [5000, 8000, 12000, 15000, 18000, 20000, 25000];
    const viewsLabels = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7'];

    const engagementData = [1200, 1500, 1800, 2000, 2200, 2500, 2800];
    const engagementLabels = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7'];

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Thống kê</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Thống kê tổng quan về hệ thống</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Tổng người dùng</div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalUsers.toLocaleString()}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Hoạt động: {stats.activeUsers}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Tổng truyện</div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalStories.toLocaleString()}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Tổng lượt xem</div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalViews.toLocaleString()}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Tổng tương tác</div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                            {(stats.totalLikes + stats.totalComments).toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <LineChart data={userGrowthData} labels={userGrowthLabels} title="Tăng trưởng người dùng" color="#3b82f6" />
                    <BarChart data={viewsData} labels={viewsLabels} title="Lượt xem theo tháng" color="#10b981" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <LineChart data={engagementData} labels={engagementLabels} title="Tương tác (likes + comments) theo tháng" color="#f59e0b" />
                    <DoughnutChart
                        data={[stats.totalLikes, stats.totalComments, stats.totalFollows]}
                        labels={['Likes', 'Comments', 'Follows']}
                        title="Phân bổ tương tác"
                    />
                </div>
            </div>
        </AdminLayout>
    );
}

