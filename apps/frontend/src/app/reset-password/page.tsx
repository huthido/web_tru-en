'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/lib/api/auth.service';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmNewPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (newPassword.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      setError('Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 số');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword({ token, newPassword, confirmNewPassword });
      setDone(true);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Không thể đặt lại mật khẩu. Vui lòng thử lại.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'w-full h-12 px-3 pr-12 rounded-[10px] border-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col gap-5">
          <Link href="/" className="self-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">HÙNG YÊU</h1>
          </Link>

          {!token ? (
            <div className="flex flex-col gap-4 text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Link không hợp lệ</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Link đặt lại mật khẩu thiếu token hoặc đã hỏng. Vui lòng yêu cầu link mới.
              </p>
              <Link
                href="/forgot-password"
                className="w-full h-12 flex items-center justify-center rounded-[10px] text-white font-medium bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 transition-all duration-300 shadow-md"
              >
                Yêu cầu link mới
              </Link>
            </div>
          ) : done ? (
            <div className="flex flex-col gap-4 text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Thành công</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Mật khẩu đã được đặt lại. Vui lòng đăng nhập bằng mật khẩu mới.
              </p>
              <Link
                href="/login"
                className="w-full h-12 flex items-center justify-center rounded-[10px] text-white font-medium bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 transition-all duration-300 shadow-md"
              >
                Đăng nhập
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Đặt lại mật khẩu</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Nhập mật khẩu mới cho tài khoản của bạn.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {error && (
                  <div className="px-4 py-3 rounded-lg border border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Mật khẩu mới
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Mật khẩu mới"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-blue-500 dark:text-blue-400"
                    >
                      {showPassword ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    placeholder="Nhập lại mật khẩu mới"
                    className={inputClass}
                  />
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số.
                </p>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 flex items-center justify-center rounded-[10px] text-white font-medium text-lg bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md"
                >
                  {isLoading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-900 dark:text-white">
                <Link
                  href="/login"
                  className="font-medium text-blue-500 dark:text-blue-400 hover:underline"
                >
                  Quay lại đăng nhập
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900" />
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
