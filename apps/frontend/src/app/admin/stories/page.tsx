'use client';

import { AdminLayout } from '@/components/layouts/admin-layout';
import { BarChart } from '@/components/admin/charts';

export default function AdminStoriesPage() {
    // Fake data
    const stats = {
        total: 450,
        published: 380,
        draft: 50,
        archived: 20,
        totalViews: 125000,
        totalLikes: 8500,
    };

    const topStories = [
        { title: 'Truyện A', views: 15000, likes: 1200, author: 'Tác giả 1' },
        { title: 'Truyện B', views: 12000, likes: 980, author: 'Tác giả 2' },
        { title: 'Truyện C', views: 10000, likes: 850, author: 'Tác giả 3' },
    ];

    const viewsData = [5000, 8000, 12000, 15000, 18000, 20000, 25000];
    const viewsLabels = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7'];

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý truyện</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Quản lý tất cả truyện trong hệ thống</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Tổng truyện</div>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.total}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Đã publish</div>
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.published}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Tổng lượt xem</div>
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{stats.totalViews.toLocaleString()}</div>
                    </div>
                </div>

                {/* Chart */}
                <BarChart data={viewsData} labels={viewsLabels} title="Lượt xem truyện theo tháng" color="#8b5cf6" />

                {/* Top Stories */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Truyện nổi bật</h3>
                    <div className="space-y-3">
                        {topStories.map((story, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white">{story.title}</div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">{story.author}</div>
                                </div>
                                <div className="flex gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-600 dark:text-gray-400">Lượt xem: </span>
                                        <span className="font-medium text-gray-900 dark:text-white">{story.views.toLocaleString()}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600 dark:text-gray-400">Likes: </span>
                                        <span className="font-medium text-gray-900 dark:text-white">{story.likes.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

