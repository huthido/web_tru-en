'use client';

import { BarChart, LineChart, DoughnutChart } from '@/components/admin/charts';
import { RefreshButton } from '@/components/admin/refresh-button';
import { Loading } from '@/components/ui/loading';
import { useAdminStatistics, useUserGrowth, useStoryViews } from '@/lib/api/hooks/use-statistics';
import { useQuery } from '@tanstack/react-query';
import { statisticsService } from '@/lib/api/statistics.service';

export default function AdminStatisticsPage() {
    const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useAdminStatistics();
    const { data: userGrowth, isLoading: userGrowthLoading, refetch: refetchUserGrowth } = useUserGrowth();
    const { data: storyViews, isLoading: storyViewsLoading, refetch: refetchStoryViews } = useStoryViews();
    
    // Get additional stats
    const { data: categoryDist, isLoading: categoryDistLoading } = useQuery({
        queryKey: ['admin', 'statistics', 'category-distribution'],
        queryFn: async () => {
            const allStats = await statisticsService.getStats();
            return allStats.categoryDistribution;
        },
        staleTime: 300000, // 5 minutes
    });

    const { data: roleDist, isLoading: roleDistLoading } = useQuery({
        queryKey: ['admin', 'statistics', 'role-distribution'],
        queryFn: async () => {
            const allStats = await statisticsService.getStats();
            return allStats.userRoleDistribution;
        },
        staleTime: 300000, // 5 minutes
    });

    const handleRefresh = () => {
        refetchStats();
        refetchUserGrowth();
        refetchStoryViews();
    };

    const isLoading = statsLoading || userGrowthLoading || storyViewsLoading;

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

    const userGrowthData = userGrowth?.data || statsData.userGrowth || [];
    const userGrowthLabels = userGrowth?.labels || statsData.userGrowthLabels || [];

    const storyViewsData = storyViews?.data || statsData.storyViews || [];
    const storyViewsLabels = storyViews?.labels || statsData.storyViewsLabels || [];

    const categoryData = categoryDist || statsData.categoryDistribution || { labels: [], data: [] };
    const roleData = roleDist || statsData.userRoleDistribution || { labels: [], data: [] };

    if (isLoading) {
        return (
            <>
                <Loading />
            </>
        );
    }

    return (
        <>
            <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Thống kê</h1>
                        <p className="text-sm sm:text-base text-on-surface-variant mt-1 sm:mt-2">Thống kê tổng quan về hệ thống</p>
                    </div>
                    <RefreshButton onRefresh={handleRefresh} />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <div className="bg-surface-container rounded-lg p-6 shadow-sm">
                        <div className="text-sm text-on-surface-variant">Tổng người dùng</div>
                        <div className="text-3xl font-bold text-on-surface mt-2">
                            {statsData.totalUsers.toLocaleString()}
                        </div>
                        <div className="text-xs text-on-surface-variant mt-1">
                            Đang chờ duyệt: {statsData.pendingApprovals || 0}
                        </div>
                    </div>
                    <div className="bg-surface-container rounded-lg p-6 shadow-sm">
                        <div className="text-sm text-on-surface-variant">Tổng truyện</div>
                        <div className="text-3xl font-bold text-on-surface mt-2">
                            {statsData.totalStories.toLocaleString()}
                        </div>
                        <div className="text-xs text-on-surface-variant mt-1">
                            Tổng chương: {statsData.totalChapters.toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-surface-container rounded-lg p-6 shadow-sm">
                        <div className="text-sm text-on-surface-variant">Tổng lượt xem</div>
                        <div className="text-3xl font-bold text-on-surface mt-2">
                            {statsData.totalViews.toLocaleString()}
                        </div>
                        <div className="text-xs text-on-surface-variant mt-1">
                            Trung bình: {statsData.totalStories > 0 ? Math.round(statsData.totalViews / statsData.totalStories).toLocaleString() : 0} lượt/truyện
                        </div>
                    </div>
                    <div className="bg-surface-container rounded-lg p-6 shadow-sm">
                        <div className="text-sm text-on-surface-variant">Quảng cáo</div>
                        <div className="text-3xl font-bold text-on-surface mt-2">
                            {statsData.activeAds.toLocaleString()}
                        </div>
                        <div className="text-xs text-on-surface-variant mt-1">
                            Quảng cáo đang hoạt động
                        </div>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {userGrowthData.length > 0 && userGrowthLabels.length > 0 ? (
                        <LineChart 
                            data={userGrowthData} 
                            labels={userGrowthLabels} 
                            title="Tăng trưởng người dùng" 
                            color="#3b82f6" 
                        />
                    ) : (
                        <div className="bg-surface-container rounded-lg p-6 shadow-sm flex items-center justify-center h-64">
                            <p className="text-on-surface-variant">Chưa có dữ liệu tăng trưởng người dùng</p>
                        </div>
                    )}
                    {storyViewsData.length > 0 && storyViewsLabels.length > 0 ? (
                        <BarChart 
                            data={storyViewsData} 
                            labels={storyViewsLabels} 
                            title="Lượt xem theo tháng" 
                            color="#10b981" 
                        />
                    ) : (
                        <div className="bg-surface-container rounded-lg p-6 shadow-sm flex items-center justify-center h-64">
                            <p className="text-on-surface-variant">Chưa có dữ liệu lượt xem</p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {categoryData.labels.length > 0 && categoryData.data.length > 0 ? (
                        <DoughnutChart
                            data={categoryData.data}
                            labels={categoryData.labels}
                            title="Phân bổ theo thể loại"
                        />
                    ) : (
                        <div className="bg-surface-container rounded-lg p-6 shadow-sm flex items-center justify-center h-64">
                            <p className="text-on-surface-variant">Chưa có dữ liệu phân bổ thể loại</p>
                        </div>
                    )}
                    {roleData.labels.length > 0 && roleData.data.length > 0 ? (
                        <DoughnutChart
                            data={roleData.data}
                            labels={roleData.labels}
                            title="Phân bổ vai trò người dùng"
                        />
                    ) : (
                        <div className="bg-surface-container rounded-lg p-6 shadow-sm flex items-center justify-center h-64">
                            <p className="text-on-surface-variant">Chưa có dữ liệu phân bổ vai trò</p>
                        </div>
                    )}
                </div>

                {/* Top Stories */}
                {statsData.topStories && statsData.topStories.length > 0 && (
                    <div className="bg-surface-container rounded-lg p-6 shadow-sm">
                        <h2 className="text-xl font-bold mb-4">Top truyện được xem nhiều nhất</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-surface-container-low">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Truyện</th>
                                        <th className="px-4 py-3 text-left">Tác giả</th>
                                        <th className="px-4 py-3 text-left">Lượt xem</th>
                                        <th className="px-4 py-3 text-left">Ngày tạo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant">
                                    {statsData.topStories.map((story) => (
                                        <tr key={story.id} className="hover:bg-surface-container-high">
                                            <td className="px-4 py-3 font-medium">{story.title}</td>
                                            <td className="px-4 py-3">{story.authorName || 'N/A'}</td>
                                            <td className="px-4 py-3">{story.viewCount.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-sm text-on-surface-variant">
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

