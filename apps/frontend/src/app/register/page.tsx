'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/components/providers/theme-provider';
import { useSettings } from '@/lib/api/hooks/use-settings';
import { Loading } from '@/components/ui/loading';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isRegistering, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Redirect to home if already authenticated
  useEffect(() => {
    // Đợi auth check hoàn thành
    if (!isAuthLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  // Loading animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Note: Registration is always allowed now (allowRegistration setting removed)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (formData.password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      setError('Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số');
      return;
    }

    if (formData.username.length < 3) {
      setError('Username phải có ít nhất 3 ký tự');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setError('Username chỉ được chứa chữ cái, số và dấu gạch dưới');
      return;
    }

    try {
      await register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        displayName: formData.displayName || undefined,
      });
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Đăng ký thất bại');
    }
  };

  // Show loading while checking settings or auth
  if (isLoading || settingsLoading || isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <Loading />
      </div>
    );
  }

  // Don't render register form if already authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  // If registration is not allowed, show message (will redirect via useEffect)
  if (settings && !settings.allowRegistration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="max-w-md w-full text-center p-6">
          <div className="mb-6">
            <svg
              className="mx-auto h-24 w-24 text-yellow-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Đăng ký tạm thời bị tắt
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Đăng ký tài khoản mới hiện đang bị tắt. Vui lòng liên hệ quản trị viên.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-3 md:p-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header - Logo and Theme Toggle */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-all duration-300 shadow-sm">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 md:gap-2.5 transition-all duration-300 hover:opacity-80 hover:scale-105 active:scale-95"
        >
          <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
            HÙNG YÊU
          </h1>
          <div className="w-8 h-8 transition-transform duration-300 hover:rotate-12">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M26.6667 2.66667L26.6667 29.3333L16 24.1917L5.33333 29.3333L5.33333 2.66667L26.6667 2.66667Z"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-900 dark:text-white transition-colors duration-300"
              />
              <path
                d="M16 2.66667V24.1917"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-900 dark:text-white transition-colors duration-300"
              />
            </svg>
          </div>
        </Link>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all duration-300 hover:scale-105 active:scale-95 bg-white dark:bg-gray-800 border-blue-500 dark:border-blue-400 shadow-sm hover:shadow-md"
          aria-label="Chuyển đổi giao diện"
        >
          {theme === 'light' ? (
            <>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="transition-transform duration-300">
                <path
                  d="M10 3.33333V1.66667M10 18.3333V16.6667M16.6667 10H18.3333M1.66667 10H3.33333M15.7733 4.22667L16.8333 3.16667M3.16667 16.8333L4.22667 15.7733M15.7733 15.7733L16.8333 16.8333M3.16667 3.16667L4.22667 4.22667M14.1667 10C14.1667 12.3012 12.3012 14.1667 10 14.1667C7.69881 14.1667 5.83333 12.3012 5.83333 10C5.83333 7.69881 7.69881 5.83333 10 5.83333C12.3012 5.83333 14.1667 7.69881 14.1667 10Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="text-gray-900 dark:text-white transition-colors duration-300"
                />
              </svg>
              <span className="text-sm font-medium text-gray-900 dark:text-white transition-colors duration-300">
                Sáng
              </span>
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="transition-transform duration-300">
                <path
                  d="M10 3.33333C6.3181 3.33333 3.33333 6.3181 3.33333 10C3.33333 13.6819 6.3181 16.6667 10 16.6667C13.6819 16.6667 16.6667 13.6819 16.6667 10C16.6667 9.17157 16.4958 8.38014 16.1867 7.66667M10 1.66667V3.33333M10 16.6667V18.3333M18.3333 10H16.6667M3.33333 10H1.66667M15.7733 4.22667L14.7133 5.28667M5.28667 14.7133L4.22667 15.7733M15.7733 15.7733L14.7133 14.7133M5.28667 5.28667L4.22667 4.22667"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className="text-gray-900 dark:text-white transition-colors duration-300"
                />
              </svg>
              <span className="text-sm font-medium text-gray-900 dark:text-white transition-colors duration-300">
                Tối
              </span>
            </>
          )}
        </button>
      </div>

      {/* Main Content Container */}
      <div className="w-full max-w-[400px] mt-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col gap-5">
          {/* Title */}
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
            Đăng ký
          </h2>

          {/* Google Button */}
          <button
            type="button"
            onClick={() => {
              const apiUrl = process.env.NODE_ENV === 'development' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') : '';
              window.location.href = `${apiUrl}/api/auth/google`;
            }}
            className="w-full h-12 flex items-center justify-center gap-2.5 rounded-[10px] border-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-white dark:bg-gray-800 border-gray-900 dark:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md group"
          >
            <div className="w-5 h-5 relative transition-transform duration-300 group-hover:scale-110">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M19.6 10.2273C19.6 9.51818 19.5364 8.83636 19.4182 8.18182H10V12.05H15.3818C15.15 13.3 14.4455 14.3591 13.3864 15.0682V17.5773H16.6182C18.5091 15.8364 19.6 13.2727 19.6 10.2273Z"
                  fill="#4285F4"
                />
                <path
                  d="M10 20C12.7 20 14.9636 19.1045 16.6182 17.5773L13.3864 15.0682C12.4909 15.6682 11.3455 16.0227 10 16.0227C7.39545 16.0227 5.19091 14.2636 4.40455 11.9H1.06364V14.4909C2.70909 17.7591 6.09091 20 10 20Z"
                  fill="#34A853"
                />
                <path
                  d="M4.40455 11.9C4.20455 11.3 4.09091 10.6591 4.09091 10C4.09091 9.34091 4.20455 8.7 4.40455 8.1V5.50909H1.06364C0.386364 6.85909 0 8.38636 0 10C0 11.6136 0.386364 13.1409 1.06364 14.4909L4.40455 11.9Z"
                  fill="#FBBC05"
                />
                <path
                  d="M10 3.97727C11.4682 3.97727 12.7864 4.46818 13.8227 5.35455L16.6909 2.48636C14.9591 0.904545 12.6955 0 10 0C6.09091 0 2.70909 2.24091 1.06364 5.50909L4.40455 8.1C5.19091 5.73636 7.39545 3.97727 10 3.97727Z"
                  fill="#EA4335"
                />
              </svg>
            </div>
            <span className="text-base font-medium text-gray-900 dark:text-white transition-colors duration-300">
              Đăng ký bằng Google
            </span>
          </button>

          {/* Facebook Button */}
          <button
            type="button"
            onClick={() => {
              const apiUrl = process.env.NODE_ENV === 'development' ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') : '';
              window.location.href = `${apiUrl}/api/auth/facebook`;
            }}
            className="w-full h-12 flex items-center justify-center gap-2.5 rounded-[10px] border-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-transparent dark:bg-gray-800 border-gray-900 dark:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md group"
          >
            <div className="w-5 h-5 relative transition-transform duration-300 group-hover:scale-110">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M18.3333 10C18.3333 5.4 14.6 1.66667 10 1.66667C5.4 1.66667 1.66667 5.4 1.66667 10C1.66667 14.0167 4.68333 17.35 8.61667 18.1167V12.5H6.66667V10H8.61667V8.08333C8.61667 6.01667 9.85 4.83333 11.7167 4.83333C12.6 4.83333 13.5167 5 13.5167 5V7.16667H12.5333C11.5667 7.16667 11.25 7.75 11.25 8.35V10H13.4167L13.0167 12.5H11.25V18.1167C15.1833 17.35 18.3333 14.0167 18.3333 10Z"
                  fill="#1877F2"
                />
              </svg>
            </div>
            <span className="text-base font-medium text-gray-900 dark:text-white transition-colors duration-300">
              Đăng ký bằng Facebook
            </span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center my-2">
            <div className="flex-1 border-t border-gray-900 dark:border-gray-300 transition-colors duration-300" />
            <div className="px-2 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
              <span className="text-base text-gray-900 dark:text-white transition-colors duration-300">
                Hoặc
              </span>
            </div>
            <div className="flex-1 border-t border-gray-900 dark:border-gray-300 transition-colors duration-300" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Error Message */}
            {error && (
              <div className="px-4 py-3 rounded-lg border border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 transition-all duration-300 animate-in fade-in slide-in-from-top-2 flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39763 14.6024 1.66667 10 1.66667C5.39763 1.66667 1.66667 5.39763 1.66667 10C1.66667 14.6024 5.39763 18.3333 10 18.3333Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 6.66667V10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 13.3333H10.0083"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Email Input */}
            <div className="relative">
              <label
                className={`absolute left-3 px-1 text-sm font-medium bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-all duration-300 z-10 ${focusedField === 'email' || formData.email
                  ? '-top-2.5 opacity-100'
                  : 'top-3 opacity-0'
                  }`}
              >
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                className="w-full h-12 px-3 rounded-[10px] border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 hover:border-gray-400 dark:hover:border-gray-500"
                placeholder="Email"
                required
              />
            </div>

            {/* Username Input */}
            <div className="relative">
              <label
                className={`absolute left-3 px-1 text-sm font-medium bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-all duration-300 z-10 ${focusedField === 'username' || formData.username
                  ? '-top-2.5 opacity-100'
                  : 'top-3 opacity-0'
                  }`}
              >
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                className="w-full h-12 px-3 rounded-[10px] border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 hover:border-gray-400 dark:hover:border-gray-500"
                placeholder="Username"
                required
              />
            </div>

            {/* Display Name Input (Optional) */}
            <div className="relative">
              <label
                className={`absolute left-3 px-1 text-sm font-medium bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-all duration-300 z-10 ${focusedField === 'displayName' || formData.displayName
                  ? '-top-2.5 opacity-100'
                  : 'top-3 opacity-0'
                  }`}
              >
                Tên hiển thị (tùy chọn)
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                onFocus={() => setFocusedField('displayName')}
                onBlur={() => setFocusedField(null)}
                className="w-full h-12 px-3 rounded-[10px] border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 hover:border-gray-400 dark:hover:border-gray-500"
                placeholder="Tên hiển thị"
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <label
                className={`absolute left-3 px-1 text-sm font-medium bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-all duration-300 z-10 ${focusedField === 'password' || formData.password
                  ? '-top-2.5 opacity-100'
                  : 'top-3 opacity-0'
                  }`}
              >
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full h-12 px-3 pr-12 rounded-[10px] border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 hover:border-gray-400 dark:hover:border-gray-500"
                  placeholder="Mật khẩu"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-600 dark:text-gray-400 transition-all duration-300 hover:text-gray-900 dark:hover:text-white hover:scale-110 active:scale-95"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="transition-transform duration-300">
                      <path
                        d="M10 3.75C5.83333 3.75 2.27417 6.34167 0.833328 10C2.27417 13.6583 5.83333 16.25 10 16.25C14.1667 16.25 17.7258 13.6583 19.1667 10C17.7258 6.34167 14.1667 3.75 10 3.75ZM10 14.1667C7.69917 14.1667 5.83333 12.3008 5.83333 10C5.83333 7.69917 7.69917 5.83333 10 5.83333C12.3008 5.83333 14.1667 7.69917 14.1667 10C14.1667 12.3008 12.3008 14.1667 10 14.1667ZM10 7.5C8.61917 7.5 7.5 8.61917 7.5 10C7.5 11.3808 8.61917 12.5 10 12.5C11.3808 12.5 12.5 11.3808 12.5 10C12.5 8.61917 11.3808 7.5 10 7.5Z"
                        fill="currentColor"
                      />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="transition-transform duration-300">
                      <path
                        d="M10 3.75C5.83333 3.75 2.27417 6.34167 0.833328 10C2.27417 13.6583 5.83333 16.25 10 16.25C14.1667 16.25 17.7258 13.6583 19.1667 10C17.7258 6.34167 14.1667 3.75 10 3.75ZM10 14.1667C7.69917 14.1667 5.83333 12.3008 5.83333 10C5.83333 7.69917 7.69917 5.83333 10 5.83333C12.3008 5.83333 14.1667 7.69917 14.1667 10C14.1667 12.3008 12.3008 14.1667 10 14.1667ZM10 7.5C8.61917 7.5 7.5 8.61917 7.5 10C7.5 11.3808 8.61917 12.5 10 12.5C11.3808 12.5 12.5 11.3808 12.5 10C12.5 8.61917 11.3808 7.5 10 7.5Z"
                        fill="currentColor"
                      />
                      <path
                        d="M0.833328 0.833328L19.1667 19.1667"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="relative">
              <label
                className={`absolute left-3 px-1 text-sm font-medium bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-all duration-300 z-10 ${focusedField === 'confirmPassword' || formData.confirmPassword
                  ? '-top-2.5 opacity-100'
                  : 'top-3 opacity-0'
                  }`}
              >
                Xác nhận mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  className="w-full h-12 px-3 pr-12 rounded-[10px] border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 hover:border-gray-400 dark:hover:border-gray-500"
                  placeholder="Xác nhận mật khẩu"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-600 dark:text-gray-400 transition-all duration-300 hover:text-gray-900 dark:hover:text-white hover:scale-110 active:scale-95"
                  aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showConfirmPassword ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="transition-transform duration-300">
                      <path
                        d="M10 3.75C5.83333 3.75 2.27417 6.34167 0.833328 10C2.27417 13.6583 5.83333 16.25 10 16.25C14.1667 16.25 17.7258 13.6583 19.1667 10C17.7258 6.34167 14.1667 3.75 10 3.75ZM10 14.1667C7.69917 14.1667 5.83333 12.3008 5.83333 10C5.83333 7.69917 7.69917 5.83333 10 5.83333C12.3008 5.83333 14.1667 7.69917 14.1667 10C14.1667 12.3008 12.3008 14.1667 10 14.1667ZM10 7.5C8.61917 7.5 7.5 8.61917 7.5 10C7.5 11.3808 8.61917 12.5 10 12.5C11.3808 12.5 12.5 11.3808 12.5 10C12.5 8.61917 11.3808 7.5 10 7.5Z"
                        fill="currentColor"
                      />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="transition-transform duration-300">
                      <path
                        d="M10 3.75C5.83333 3.75 2.27417 6.34167 0.833328 10C2.27417 13.6583 5.83333 16.25 10 16.25C14.1667 16.25 17.7258 13.6583 19.1667 10C17.7258 6.34167 14.1667 3.75 10 3.75ZM10 14.1667C7.69917 14.1667 5.83333 12.3008 5.83333 10C5.83333 7.69917 7.69917 5.83333 10 5.83333C12.3008 5.83333 14.1667 7.69917 14.1667 10C14.1667 12.3008 12.3008 14.1667 10 14.1667ZM10 7.5C8.61917 7.5 7.5 8.61917 7.5 10C7.5 11.3808 8.61917 12.5 10 12.5C11.3808 12.5 12.5 11.3808 12.5 10C12.5 8.61917 11.3808 7.5 10 7.5Z"
                        fill="currentColor"
                      />
                      <path
                        d="M0.833328 0.833328L19.1667 19.1667"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Register Button */}
            <button
              type="submit"
              disabled={isRegistering}
              className="w-full h-12 flex items-center justify-center gap-2.5 rounded-[10px] text-white font-medium text-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 shadow-md hover:shadow-lg relative overflow-hidden group"
            >
              {isRegistering && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              )}
              {isRegistering ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  <span>Đang đăng ký...</span>
                </>
              ) : (
                <>
                  <svg width="30" height="30" viewBox="0 0 30 30" fill="none" className="transition-transform duration-300 group-hover:translate-x-1">
                    <path
                      d="M3.75 5.625L15 15L26.25 5.625M26.25 5.625H3.75M26.25 5.625V24.375H3.75V5.625"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Đăng ký</span>
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-base text-gray-900 dark:text-white transition-colors duration-300">
            Đã có tài khoản?{' '}
            <Link
              href="/login"
              className="font-medium text-blue-500 dark:text-blue-400 hover:underline transition-all duration-300 hover:text-blue-600 dark:hover:text-blue-300"
            >
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
