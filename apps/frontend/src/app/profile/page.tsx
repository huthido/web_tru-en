'use client';

import { useState, useEffect, useRef } from 'react';
import { ProtectedRoute } from '@/components/layouts/protected-route';
import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { AdSlot } from '@/components/ads/ad-slot';
import { useAuth } from '@/contexts/auth-context';
import { usersService } from '@/lib/api/users.service';
import { compressImageToTarget, COMPRESS_TARGET, MAX_INPUT_BYTES, isImageFile } from '@/lib/utils/compress-image';
import { authService } from '@/lib/api/auth.service';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserStats } from '@/components/users/user-stats';
import { MobileExtraMenu } from '@/components/layouts/mobile-extra-menu';
import { ExternalLink } from 'lucide-react';

interface ProfileFormData {
  email: string;
  password: string;
  displayName: string;
  bio: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

function ProfileContent() {
  const { user, logout, isLoggingOut, isLoading: isLoadingAuth } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ProfileFormData>({
    email: '',
    password: '••••••••',
    displayName: '',
    bio: '',
  });

  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploadMode, setUploadMode] = useState<'url' | 'upload'>('url');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  // Use user data from auth context (from /api/auth/me)
  // Update form data when user loads
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        password: '••••••••',
        displayName: user.displayName || '',
        bio: user.bio || '',
      });
    }
  }, [user]);

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: (data: { displayName?: string; bio?: string; avatar?: string }) => usersService.updateProfile(data),
    onSuccess: (updatedUser: any) => {
      // Patch cache immediately so all screens (Header, Sidebar…) see the new
      // name/avatar/bio without waiting for a background refetch to complete.
      queryClient.setQueryData(['auth', 'me'], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          displayName: updatedUser?.displayName ?? old.displayName,
          avatar: updatedUser?.avatar ?? old.avatar,
          bio: updatedUser?.bio ?? old.bio,
        };
      });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'me', 'stats'] });
      setSuccessMessage('Cập nhật hồ sơ thành công!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setErrors({});
    },
    onError: (error: any) => {
      setErrors({ submit: error.response?.data?.error || error.message || 'Có lỗi xảy ra khi cập nhật hồ sơ' });
    },
  });

  // Tài khoản Google chưa có mật khẩu → form "Tạo mật khẩu" (không cần
  // mật khẩu hiện tại). hasPassword đến từ /auth/me.
  const needsSetPassword = !!user && user.hasPassword === false;

  // Set password mutation — tạo mật khẩu lần đầu cho tài khoản OAuth
  const setPasswordMutation = useMutation({
    mutationFn: (data: { newPassword: string; confirmNewPassword: string }) =>
      authService.setPassword(data),
    onSuccess: () => {
      // Refetch /auth/me để hasPassword chuyển true → form trở về "Đổi mật khẩu"
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      setSuccessMessage('Tạo mật khẩu thành công! Từ giờ bạn có thể đăng nhập bằng email + mật khẩu.');
      setTimeout(() => setSuccessMessage(''), 5000);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      setShowPasswordForm(false);
      setErrors({});
    },
    onError: (error: any) => {
      setErrors({ password: error.response?.data?.error || 'Có lỗi xảy ra khi tạo mật khẩu' });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: {
      currentPassword: string;
      newPassword: string;
      confirmNewPassword: string;
    }) => authService.changePassword(data),
    onSuccess: () => {
      setSuccessMessage('Đổi mật khẩu thành công!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      setShowPasswordForm(false);
      setErrors({});
    },
    onError: (error: any) => {
      setErrors({ password: error.response?.data?.error || 'Có lỗi xảy ra khi đổi mật khẩu' });
    },
  });

  // Handle form input change
  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // Handle password input change
  const handlePasswordChange = (field: keyof PasswordFormData, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: '' }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Họ và tên không được để trống';
    }

    if (showPasswordForm) {
      const trimmedNewPassword = passwordData.newPassword.trim();
      const trimmedConfirmPassword = passwordData.confirmNewPassword.trim();

      if (!needsSetPassword && !passwordData.currentPassword.trim()) {
        newErrors.password = 'Vui lòng nhập mật khẩu hiện tại';
      } else if (!trimmedNewPassword) {
        newErrors.password = 'Vui lòng nhập mật khẩu mới';
      } else if (trimmedNewPassword.length < 8) {
        newErrors.password = 'Mật khẩu mới phải có ít nhất 8 ký tự';
      } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(trimmedNewPassword)) {
        newErrors.password = 'Mật khẩu mới phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số';
      } else if (!trimmedConfirmPassword) {
        newErrors.password = 'Vui lòng xác nhận mật khẩu mới';
      } else if (trimmedNewPassword !== trimmedConfirmPassword) {
        newErrors.password = 'Mật khẩu xác nhận không khớp';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateForm()) {
      return;
    }

    if (showPasswordForm) {
      // Trim passwords before sending to avoid whitespace issues
      if (needsSetPassword) {
        setPasswordMutation.mutate({
          newPassword: passwordData.newPassword.trim(),
          confirmNewPassword: passwordData.confirmNewPassword.trim(),
        });
      } else {
        changePasswordMutation.mutate({
          currentPassword: passwordData.currentPassword.trim(),
          newPassword: passwordData.newPassword.trim(),
          confirmNewPassword: passwordData.confirmNewPassword.trim(),
        });
      }
    } else {
      updateMutation.mutate({
        displayName: formData.displayName.trim() || undefined,
        bio: formData.bio.trim(),
      });
    }
  };

  // Handle avatar modal open
  const handleOpenAvatarModal = () => {
    setShowAvatarModal(true);
    setUploadMode('url');
    setAvatarUrl('');
    setErrors({ avatar: '' });
  };

  // Handle save avatar URL
  const handleSaveAvatarUrl = async () => {
    if (!avatarUrl.trim()) {
      setErrors({ avatar: 'Vui lòng nhập URL ảnh' });
      return;
    }

    // Validate URL
    try {
      new URL(avatarUrl);
    } catch {
      setErrors({ avatar: 'URL không hợp lệ' });
      return;
    }

    setErrors({ avatar: '' });
    setSuccessMessage('Đang cập nhật ảnh đại diện...');

    try {
      await updateMutation.mutateAsync({ avatar: avatarUrl.trim() });
      setSuccessMessage('Cập nhật ảnh đại diện thành công!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowAvatarModal(false);
      setAvatarUrl('');
    } catch (error: any) {
      setErrors({ avatar: error.response?.data?.error || 'Có lỗi xảy ra khi cập nhật ảnh đại diện' });
      setSuccessMessage('');
    }
  };

  // Handle upload avatar file
  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type — accept cả .heic/.heif không có MIME (Chrome desktop).
    if (!isImageFile(file)) {
      setErrors({ avatar: 'Vui lòng chọn file ảnh' });
      return;
    }

    // Cho phép input tới 50MB — client sẽ nén xuống <= 500KB trước upload.
    if (file.size > MAX_INPUT_BYTES) {
      setErrors({ avatar: 'Kích thước ảnh không được vượt quá 50MB' });
      return;
    }

    setErrors({ avatar: '' });
    setSuccessMessage('Đang xử lý ảnh...');

    try {
      const compressed = await compressImageToTarget(
        file,
        { maxWidth: 512, maxHeight: 512, quality: 0.85 },
        COMPRESS_TARGET.avatar,
      );
      setSuccessMessage('Đang tải ảnh lên...');
      const response = await usersService.uploadAvatar(compressed);
      const avatarUrl = response?.data?.avatar || (response as any)?.avatar;

      if (avatarUrl) {
        setSuccessMessage('Cập nhật ảnh đại diện thành công!');
        setTimeout(() => setSuccessMessage(''), 3000);
        setShowAvatarModal(false);
        // Refresh profile data
        queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      } else {
        throw new Error('Không nhận được URL ảnh từ server');
      }
    } catch (error: any) {
      setErrors({ avatar: error.response?.data?.error || error.message || 'Có lỗi xảy ra khi tải ảnh lên' });
      setSuccessMessage('');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Format date for input
  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (isLoadingAuth || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-container-low">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface transition-colors duration-300">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="md:ml-60 pb-16 md:pb-0">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)]">
          <div className="max-w-6xl mx-auto px-4 md:px-8">
            <AdSlot slotKey="profile.top" />
            {/* Mobile menu grid — chỉ hiện ở mobile; gom tất cả mục phụ
                (trước đây nằm trong drawer "Khác") vào 1 chỗ. */}
            <MobileExtraMenu />

            <div className="mt-6 md:mt-0 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              {/* Left Section - Form */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-surface-container rounded-2xl shadow-lg p-6 md:p-8">
                  <div className="flex items-start justify-between gap-3 mb-6">
                    <div>
                      <h1 className="text-2xl md:text-3xl font-bold text-on-surface">
                        Cài đặt tài khoản
                      </h1>
                      <p className="text-sm text-on-surface-variant mt-1">
                        Thông tin đăng nhập & hồ sơ hiển thị công khai
                      </p>
                    </div>
                    {user?.username && (
                      <Link
                        href={`/u/${user.username}`}
                        className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="hidden sm:inline">Trang cá nhân</span>
                      </Link>
                    )}
                  </div>

                  {/* Success Message */}
                  {successMessage && (
                    <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200">
                      {successMessage}
                    </div>
                  )}

                  {/* Error Message */}
                  {errors.submit && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
                      {errors.submit}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Email */}
                    <div className="relative">
                      <label className="absolute -top-2.5 left-3 px-2 bg-surface-container text-sm font-medium text-on-surface-variant z-10">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        disabled
                        className="w-full px-4 py-3 border-2 border-outline-variant rounded-lg bg-surface-container-low text-on-surface cursor-not-allowed"
                      />
                    </div>

                    {/* Username */}
                    <div className="relative">
                      <label className="absolute -top-2.5 left-3 px-2 bg-surface-container text-sm font-medium text-on-surface-variant z-10">
                        Tên đăng nhập
                      </label>
                      <input
                        type="text"
                        value={user?.username || ''}
                        disabled
                        className="w-full px-4 py-3 border-2 border-outline-variant rounded-lg bg-surface-container-low text-on-surface cursor-not-allowed"
                      />
                    </div>

                    {/* Password */}
                    <div className="relative">
                      <label className="absolute -top-2.5 left-3 px-2 bg-surface-container text-sm font-medium text-on-surface-variant z-10">
                        Mật khẩu
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type={showPasswordForm ? 'text' : 'password'}
                          value={showPasswordForm ? passwordData.newPassword : formData.password}
                          onChange={(e) => {
                            if (showPasswordForm) {
                              handlePasswordChange('newPassword', e.target.value);
                            }
                          }}
                          onFocus={() => setShowPasswordForm(true)}
                          placeholder={
                            showPasswordForm
                              ? 'Nhập mật khẩu mới'
                              : needsSetPassword
                                ? 'Chưa có mật khẩu — nhấn để tạo'
                                : '••••••••'
                          }
                          className="flex-1 px-4 py-3 border-2 border-outline-variant rounded-lg bg-surface-container text-on-surface focus:border-primary dark:focus:border-blue-400 focus:outline-none transition-colors"
                        />
                        {showPasswordForm && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowPasswordForm(false);
                              setPasswordData({
                                currentPassword: '',
                                newPassword: '',
                                confirmNewPassword: '',
                              });
                              setErrors({ password: '' });
                            }}
                            className="px-3 py-2 text-sm text-on-surface-variant hover:text-on-surface dark:hover:text-white"
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                      {showPasswordForm && (
                        <div className="mt-2 space-y-3">
                          {needsSetPassword ? (
                            <p className="text-xs text-on-surface-variant">
                              Tài khoản đăng nhập bằng Google chưa có mật khẩu. Tạo mật khẩu
                              để có thể đăng nhập trực tiếp bằng email.
                            </p>
                          ) : (
                            <input
                              type="password"
                              value={passwordData.currentPassword}
                              onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                              placeholder="Mật khẩu hiện tại"
                              className="w-full px-4 py-3 border-2 border-outline-variant rounded-lg bg-surface-container text-on-surface focus:border-primary dark:focus:border-blue-400 focus:outline-none transition-colors"
                            />
                          )}
                          <input
                            type="password"
                            value={passwordData.confirmNewPassword}
                            onChange={(e) => handlePasswordChange('confirmNewPassword', e.target.value)}
                            placeholder="Xác nhận mật khẩu mới"
                            className="w-full px-4 py-3 border-2 border-outline-variant rounded-lg bg-surface-container text-on-surface focus:border-primary dark:focus:border-blue-400 focus:outline-none transition-colors"
                          />
                        </div>
                      )}
                      {errors.password && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
                      )}
                    </div>

                    {/* Full Name */}
                    <div className="relative">
                      <label className="absolute -top-2.5 left-3 px-2 bg-surface-container text-sm font-medium text-on-surface-variant z-10">
                        Họ và tên
                      </label>
                      <input
                        type="text"
                        value={formData.displayName}
                        onChange={(e) => handleInputChange('displayName', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-outline-variant rounded-lg bg-surface-container text-on-surface focus:border-primary dark:focus:border-blue-400 focus:outline-none transition-colors"
                      />
                      {errors.displayName && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.displayName}</p>
                      )}
                    </div>

                    {/* Bio / Giới thiệu — hiển thị trên trang cá nhân công khai */}
                    <div className="relative">
                      <label className="absolute -top-2.5 left-3 px-2 bg-surface-container text-sm font-medium text-on-surface-variant z-10">
                        Giới thiệu
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => handleInputChange('bio', e.target.value)}
                        maxLength={500}
                        rows={4}
                        placeholder="Vài dòng giới thiệu về bạn — hiển thị trên trang cá nhân công khai của bạn."
                        className="w-full px-4 py-3 border-2 border-outline-variant rounded-lg bg-surface-container text-on-surface focus:border-primary dark:focus:border-blue-400 focus:outline-none transition-colors resize-none"
                      />
                      <p className="mt-1 text-xs text-on-surface-variant text-right">
                        {formData.bio.length}/500
                      </p>
                    </div>


                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={updateMutation.isPending || changePasswordMutation.isPending || setPasswordMutation.isPending}
                      className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-on-primary font-medium rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {updateMutation.isPending || changePasswordMutation.isPending || setPasswordMutation.isPending
                        ? 'Đang xử lý...'
                        : showPasswordForm
                          ? needsSetPassword
                            ? 'Tạo mật khẩu'
                            : 'Đổi mật khẩu'
                          : 'Xác nhận'}
                    </button>
                  </form>
                </div>

                {/* User Stats Section - Mobile only */}
                <div className="lg:hidden bg-surface-container rounded-2xl shadow-lg p-6 md:p-8">
                  <h2 className="text-xl md:text-2xl font-bold text-on-surface mb-6">
                    Thống kê của tôi
                  </h2>
                  <UserStats />
                </div>
              </div>

              {/* Right Section - Avatar */}
              <div className="lg:col-span-1">
                <div className="bg-surface-container rounded-2xl shadow-lg p-6 md:p-8 flex flex-col items-center sticky top-4">
                  {/* Avatar */}
                  <div className="relative mb-6">
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-orange-400 p-1">
                      <div className="w-full h-full rounded-full bg-surface-container flex items-center justify-center overflow-hidden">
                        {user?.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.displayName || user.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-4xl md:text-5xl font-bold text-on-surface-variant">
                            {(user?.displayName || user?.username || 'U').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.heic,.heif"
                      onChange={handleUploadAvatar}
                      className="hidden"
                    />
                    {errors.avatar && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400 text-center">{errors.avatar}</p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="w-full space-y-3">
                    <button
                      type="button"
                      onClick={handleOpenAvatarModal}
                      className="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-on-primary font-medium rounded-lg transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                      Thay ảnh
                    </button>
                    {/* Link vào khu quản trị — chỉ hiện với tài khoản admin. */}
                    {user?.role === 'ADMIN' && (
                      <Link
                        href="/admin"
                        className="w-full px-4 py-3 bg-tertiary hover:bg-tertiary/90 text-on-tertiary font-medium rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        Trang quản trị
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full px-4 py-3 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white font-medium rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* User Stats Section - Desktop full width */}
            <div className="hidden lg:block mt-6 md:mt-8">
              <div className="bg-surface-container rounded-2xl shadow-lg p-6 md:p-8">
                <h2 className="text-xl md:text-2xl font-bold text-on-surface mb-6">
                  Thống kê của tôi
                </h2>
                <UserStats />
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Avatar Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-on-surface">Thay đổi ảnh đại diện</h2>
              <button
                type="button"
                onClick={() => {
                  setShowAvatarModal(false);
                  setAvatarUrl('');
                  setErrors({ avatar: '' });
                }}
                className="text-on-surface-variant hover:text-on-surface dark:hover:text-white transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-outline-variant">
              <button
                type="button"
                onClick={() => {
                  setUploadMode('url');
                  setAvatarUrl('');
                  setErrors({ avatar: '' });
                }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${uploadMode === 'url'
                  ? 'text-primary border-b-2 border-blue-500'
                  : 'text-on-surface-variant hover:text-on-surface dark:hover:text-white'
                  }`}
              >
                Dán URL
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadMode('upload');
                  setAvatarUrl('');
                  setErrors({ avatar: '' });
                }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${uploadMode === 'upload'
                  ? 'text-primary border-b-2 border-blue-500'
                  : 'text-on-surface-variant hover:text-on-surface dark:hover:text-white'
                  }`}
              >
                Tải ảnh lên
              </button>
            </div>

            {/* Content */}
            {uploadMode === 'url' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-2">
                    URL ảnh
                  </label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => {
                      setAvatarUrl(e.target.value);
                      if (errors.avatar) setErrors({ avatar: '' });
                    }}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full px-4 py-3 border-2 border-outline-variant rounded-lg bg-surface-container text-on-surface focus:border-primary dark:focus:border-blue-400 focus:outline-none transition-colors"
                  />
                </div>
                {errors.avatar && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.avatar}</p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAvatarModal(false);
                      setAvatarUrl('');
                      setErrors({ avatar: '' });
                    }}
                    className="flex-1 px-4 py-2 border-2 border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAvatarUrl}
                    disabled={updateMutation.isPending}
                    className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateMutation.isPending ? 'Đang lưu...' : 'Lưu'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-2">
                    Chọn ảnh từ máy tính
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-3 border-2 border-dashed border-outline-variant rounded-lg text-on-surface-variant hover:border-blue-500 dark:hover:border-blue-400 hover:bg-surface-container-high transition-colors"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                      </svg>
                      <span className="text-sm">Chọn file ảnh (tối đa 5MB)</span>
                    </div>
                  </button>
                </div>
                {errors.avatar && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.avatar}</p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAvatarModal(false);
                      setErrors({ avatar: '' });
                    }}
                    className="flex-1 px-4 py-2 border-2 border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
