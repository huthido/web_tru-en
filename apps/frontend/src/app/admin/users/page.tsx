'use client';

import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Loading } from '@/components/ui/loading';
import { useUsers, useUpdateUser } from '@/lib/api/hooks/use-users';
import { User } from '@/lib/api/users.service';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { UserRole } from '@shared/types';
import * as XLSX from 'xlsx';

export default function AdminUsersPage() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('');
    const [isActiveFilter, setIsActiveFilter] = useState<string>('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [viewingUser, setViewingUser] = useState<User | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [showBulkActionModal, setShowBulkActionModal] = useState(false);
    const [bulkAction, setBulkAction] = useState<'ban' | 'unban' | null>(null);
    const [banningUser, setBanningUser] = useState<User | null>(null);
    const [showBanModal, setShowBanModal] = useState(false);

    const { data, isLoading, refetch } = useUsers({
        page,
        limit,
        search: search || undefined,
        role: roleFilter || undefined,
        isActive: isActiveFilter === '' ? undefined : isActiveFilter === 'true',
    });

    const updateMutation = useUpdateUser();

    const users = data?.data || [];
    const meta = data?.meta;

    const handleUpdate = async (formData: any) => {
        if (editingUser) {
            await updateMutation.mutateAsync({
                id: editingUser.id,
                data: formData,
            });
            setShowEditModal(false);
            setEditingUser(null);
        }
    };

    const handleBanUser = async (user: User) => {
        await updateMutation.mutateAsync({
            id: user.id,
            data: { isActive: false },
        });
        setShowBanModal(false);
        setBanningUser(null);
    };

    const handleUnbanUser = async (user: User) => {
        await updateMutation.mutateAsync({
            id: user.id,
            data: { isActive: true },
        });
    };

    const handleBulkAction = async () => {
        if (!bulkAction || selectedUsers.size === 0) return;

        const promises = Array.from(selectedUsers).map((userId) =>
            updateMutation.mutateAsync({
                id: userId,
                data: { isActive: bulkAction === 'unban' },
            })
        );

        await Promise.all(promises);
        setSelectedUsers(new Set());
        setShowBulkActionModal(false);
        setBulkAction(null);
    };

    const handleExportExcel = () => {
        // Fetch all users without pagination for export
        const exportData = users.map((user) => ({
            'ID': user.id,
            'Email': user.email,
            'Username': user.username,
            'Tên hiển thị': user.displayName || '',
            'Vai trò': user.role,
            'Trạng thái': user.isActive ? 'Hoạt động' : 'Đã khóa',
            'Số truyện': user._count?.authoredStories || 0,
            'Số bình luận': user._count?.comments || 0,
            'Số yêu thích': user._count?.favorites || 0,
            'Số theo dõi': user._count?.follows || 0,
            'Ngày tạo': new Date(user.createdAt).toLocaleDateString('vi-VN'),
            'Ngày cập nhật': new Date(user.updatedAt).toLocaleDateString('vi-VN'),
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Người dùng');

        // Auto-size columns
        const colWidths = [
            { wch: 30 }, // ID
            { wch: 25 }, // Email
            { wch: 15 }, // Username
            { wch: 20 }, // Display Name
            { wch: 10 }, // Role
            { wch: 12 }, // Status
            { wch: 10 }, // Stories
            { wch: 12 }, // Comments
            { wch: 12 }, // Favorites
            { wch: 12 }, // Follows
            { wch: 15 }, // Created
            { wch: 15 }, // Updated
        ];
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, `users_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const toggleSelectUser = (userId: string) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUsers(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedUsers.size === users.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(users.map((u) => u.id)));
        }
    };

    const totalPages = meta?.totalPages || 1;
    const pageNumbers = useMemo(() => {
        const pages: (number | string)[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (page <= 3) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (page >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = page - 1; i <= page + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    }, [page, totalPages]);

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý người dùng</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">Quản lý tất cả người dùng trong hệ thống</p>
                    </div>
                    <div className="flex gap-3">
                        {selectedUsers.size > 0 && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setBulkAction('ban');
                                        setShowBulkActionModal(true);
                                    }}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                                >
                                    Khóa ({selectedUsers.size})
                                </button>
                                <button
                                    onClick={() => {
                                        setBulkAction('unban');
                                        setShowBulkActionModal(true);
                                    }}
                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                                >
                                    Mở khóa ({selectedUsers.size})
                                </button>
                            </div>
                        )}
                        <button
                            onClick={handleExportExcel}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Xuất Excel
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Tìm kiếm
                            </label>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Tìm theo tên, email, username..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Vai trò
                            </label>
                            <select
                                value={roleFilter}
                                onChange={(e) => {
                                    setRoleFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            >
                                <option value="">Tất cả</option>
                                <option value="USER">User</option>
                                <option value="AUTHOR">Author</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Trạng thái
                            </label>
                            <select
                                value={isActiveFilter}
                                onChange={(e) => {
                                    setIsActiveFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            >
                                <option value="">Tất cả</option>
                                <option value="true">Đang hoạt động</option>
                                <option value="false">Đã khóa</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Số lượng / trang
                            </label>
                            <select
                                value={limit}
                                onChange={(e) => {
                                    setLimit(Number(e.target.value));
                                    setPage(1);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            >
                                <option value="10">10</option>
                                <option value="20">20</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loading />
                    </div>
                ) : (
                    <>
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUsers.size === users.length && users.length > 0}
                                                    onChange={toggleSelectAll}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Người dùng
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Vai trò
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Thống kê
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Trạng thái
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Ngày tạo
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                                Thao tác
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {users.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                                    Không có người dùng nào
                                                </td>
                                            </tr>
                                        ) : (
                                            users.map((user) => (
                                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedUsers.has(user.id)}
                                                            onChange={() => toggleSelectUser(user.id)}
                                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            {user.avatar ? (
                                                                <img
                                                                    src={user.avatar}
                                                                    alt={user.username}
                                                                    className="w-10 h-10 rounded-full mr-3"
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium mr-3">
                                                                    {(user.displayName || user.username)[0].toUpperCase()}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                    {user.displayName || user.username}
                                                                </div>
                                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                    {user.email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span
                                                            className={`px-2 py-1 text-xs rounded-full ${user.role === 'ADMIN'
                                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                                                : user.role === 'AUTHOR'
                                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                                }`}
                                                        >
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        <div className="space-y-1">
                                                            <div>Truyện: {user._count?.authoredStories || 0}</div>
                                                            <div>Bình luận: {user._count?.comments || 0}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span
                                                            className={`px-2 py-1 text-xs rounded-full ${user.isActive
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                                }`}
                                                        >
                                                            {user.isActive ? 'Hoạt động' : 'Đã khóa'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    setViewingUser(user);
                                                                    setShowViewModal(true);
                                                                }}
                                                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                                                title="Xem chi tiết"
                                                            >
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                                    <circle cx="12" cy="12" r="3" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingUser(user);
                                                                    setShowEditModal(true);
                                                                }}
                                                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                                                title="Chỉnh sửa"
                                                            >
                                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                                </svg>
                                                            </button>
                                                            {user.isActive ? (
                                                                <button
                                                                    onClick={() => {
                                                                        setBanningUser(user);
                                                                        setShowBanModal(true);
                                                                    }}
                                                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                                    title="Khóa tài khoản"
                                                                >
                                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                                    </svg>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleUnbanUser(user)}
                                                                    className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                                                    title="Mở khóa tài khoản"
                                                                >
                                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                                        <path d="M7 11V7a5 5 0 0 1 9.33-2.5" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination */}
                        {meta && meta.totalPages > 1 && (
                            <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                                <div className="text-sm text-gray-700 dark:text-gray-300">
                                    Hiển thị {((page - 1) * limit) + 1} - {Math.min(page * limit, meta.total)} trong tổng số {meta.total} người dùng
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage(1)}
                                        disabled={page === 1}
                                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                                        title="Trang đầu"
                                    >
                                        ««
                                    </button>
                                    <button
                                        onClick={() => setPage(page - 1)}
                                        disabled={!meta.hasPrev}
                                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                                    >
                                        Trước
                                    </button>
                                    {pageNumbers.map((pageNum, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => typeof pageNum === 'number' && setPage(pageNum)}
                                            disabled={pageNum === '...' || pageNum === page}
                                            className={`px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-sm ${pageNum === page ? 'bg-blue-500 text-white border-blue-500' : ''
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setPage(page + 1)}
                                        disabled={!meta.hasNext}
                                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                                    >
                                        Sau
                                    </button>
                                    <button
                                        onClick={() => setPage(totalPages)}
                                        disabled={page === totalPages}
                                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                                        title="Trang cuối"
                                    >
                                        »»
                                    </button>
                                    <div className="ml-4 flex items-center gap-2">
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Đến trang:</span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={totalPages}
                                            value={page}
                                            onChange={(e) => {
                                                const newPage = Number(e.target.value);
                                                if (newPage >= 1 && newPage <= totalPages) {
                                                    setPage(newPage);
                                                }
                                            }}
                                            className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* View User Modal */}
            {showViewModal && viewingUser && (
                <ViewUserModal
                    user={viewingUser}
                    onClose={() => {
                        setShowViewModal(false);
                        setViewingUser(null);
                    }}
                />
            )}

            {/* Edit Modal */}
            {showEditModal && editingUser && (
                <EditUserModal
                    user={editingUser}
                    onClose={() => {
                        setShowEditModal(false);
                        setEditingUser(null);
                    }}
                    onSave={handleUpdate}
                    isLoading={updateMutation.isPending}
                />
            )}

            {/* Ban User Modal */}
            {showBanModal && banningUser && (
                <ConfirmModal
                    isOpen={showBanModal}
                    onCancel={() => {
                        setShowBanModal(false);
                        setBanningUser(null);
                    }}
                    onConfirm={() => handleBanUser(banningUser)}
                    title="Khóa tài khoản"
                    message={`Bạn có chắc chắn muốn khóa tài khoản "${banningUser.displayName || banningUser.username}"? Người dùng này sẽ không thể đăng nhập vào hệ thống.`}
                    confirmText="Khóa"
                    cancelText="Hủy"
                    confirmButtonClassName="bg-red-500 hover:bg-red-600"
                    isLoading={updateMutation.isPending}
                />
            )}

            {/* Bulk Action Modal */}
            {showBulkActionModal && bulkAction && (
                <ConfirmModal
                    isOpen={showBulkActionModal}
                    onCancel={() => {
                        setShowBulkActionModal(false);
                        setBulkAction(null);
                    }}
                    onConfirm={handleBulkAction}
                    title={bulkAction === 'ban' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                    message={`Bạn có chắc chắn muốn ${bulkAction === 'ban' ? 'khóa' : 'mở khóa'} ${selectedUsers.size} tài khoản đã chọn?`}
                    confirmText={bulkAction === 'ban' ? 'Khóa' : 'Mở khóa'}
                    cancelText="Hủy"
                    confirmButtonClassName={bulkAction === 'ban' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
                    isLoading={updateMutation.isPending}
                />
            )}
        </AdminLayout>
    );
}

function ViewUserModal({
    user,
    onClose,
}: {
    user: User;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Chi tiết người dùng</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            {user.avatar ? (
                                <img src={user.avatar} alt={user.username} className="w-20 h-20 rounded-full" />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-medium">
                                    {(user.displayName || user.username)[0].toUpperCase()}
                                </div>
                            )}
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {user.displayName || user.username}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Username
                                </label>
                                <p className="text-gray-900 dark:text-white">{user.username}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Vai trò
                                </label>
                                <span
                                    className={`inline-block px-2 py-1 text-xs rounded-full ${user.role === 'ADMIN'
                                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                        : user.role === 'AUTHOR'
                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    {user.role}
                                </span>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Trạng thái
                                </label>
                                <span
                                    className={`inline-block px-2 py-1 text-xs rounded-full ${user.isActive
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                        }`}
                                >
                                    {user.isActive ? 'Hoạt động' : 'Đã khóa'}
                                </span>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Ngày tạo
                                </label>
                                <p className="text-gray-900 dark:text-white">
                                    {new Date(user.createdAt).toLocaleString('vi-VN')}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Ngày cập nhật
                                </label>
                                <p className="text-gray-900 dark:text-white">
                                    {new Date(user.updatedAt).toLocaleString('vi-VN')}
                                </p>
                            </div>
                        </div>

                        {user.bio && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Giới thiệu
                                </label>
                                <p className="text-gray-900 dark:text-white">{user.bio}</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Thống kê
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Truyện đã tạo</div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {user._count?.authoredStories || 0}
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Bình luận</div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {user._count?.comments || 0}
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Yêu thích</div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {user._count?.favorites || 0}
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">Theo dõi</div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {user._count?.follows || 0}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function EditUserModal({
    user,
    onClose,
    onSave,
    isLoading,
}: {
    user: User;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    isLoading: boolean;
}) {
    const [formData, setFormData] = useState({
        role: user.role,
        isActive: user.isActive,
        displayName: user.displayName || '',
        bio: user.bio || '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Chỉnh sửa người dùng</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Vai trò
                            </label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            >
                                <option value="USER">User</option>
                                <option value="AUTHOR">Author</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Tên hiển thị
                            </label>
                            <input
                                type="text"
                                value={formData.displayName}
                                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Giới thiệu
                            </label>
                            <textarea
                                value={formData.bio}
                                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Đang hoạt động
                            </label>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Đang lưu...' : 'Lưu'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
