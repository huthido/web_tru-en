'use client';

import { AdminLayout } from '@/components/layouts/admin-layout';
import { BarChart } from '@/components/admin/charts';

export default function AdminChaptersPage() {
    // Fake data
    const stats = {
        total: 3200,
        published: 2800,
        draft: 400,
        totalViews: 450000,
    };

    const chaptersData = [200, 250, 300, 350, 400, 450, 500];
    const chaptersLabels = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7'];

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý chương</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Quản lý tất cả chương trong hệ thống</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Tổng chương</div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.total.toLocaleString()}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Đã publish</div>
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.published.toLocaleString()}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Bản nháp</div>
                        <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">{stats.draft.toLocaleString()}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Tổng lượt xem</div>
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{stats.totalViews.toLocaleString()}</div>
                    </div>
                </div>

                {/* Chart */}
                <LineChart data={chaptersData} labels={chaptersLabels} title="Số chương được tạo theo tháng" color="#ec4899" />
            </div>
        </AdminLayout>
    );
}

