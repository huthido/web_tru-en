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
    'w-full h-12 px-3 pr-12 rounded-[10px] border-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300 bg-surface-container border-outline-variant text-on-surface placeholder:text-on-surface-variant';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-container-low transition-colors duration-300">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col gap-5">
          <Link href="/" className="self-center">
            <h1 className="text-2xl font-bold text-on-surface">HÙNG YÊU</h1>
          </Link>

          {!token ? (
            <div className="flex flex-col gap-4 text-center">
              <h2 className="text-2xl font-bold text-on-surface">Link không hợp lệ</h2>
              <p className="text-on-surface-variant">
                Link đặt lại mật khẩu thiếu token hoặc đã hỏng. Vui lòng yêu cầu link mới.
              </p>
              <Link
                href="/forgot-password"
                className="w-full h-12 flex items-center justify-center rounded-[10px] text-on-primary font-medium bg-primary hover:bg-primary/90 transition-all duration-300 shadow-md"
              >
                Yêu cầu link mới
              </Link>
            </div>
          ) : done ? (
            <div className="flex flex-col gap-4 text-center">
              <h2 className="text-2xl font-bold text-on-surface">Thành công</h2>
              <p className="text-on-surface-variant">
                Mật khẩu đã được đặt lại. Vui lòng đăng nhập bằng mật khẩu mới.
              </p>
              <Link
                href="/login"
                className="w-full h-12 flex items-center justify-center rounded-[10px] text-on-primary font-medium bg-primary hover:bg-primary/90 transition-all duration-300 shadow-md"
              >
                Đăng nhập
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-on-surface">Đặt lại mật khẩu</h2>
              <p className="text-sm text-on-surface-variant">
                Nhập mật khẩu mới cho tài khoản của bạn.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {error && (
                  <div className="px-4 py-3 rounded-lg border border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block mb-1.5 text-sm font-medium text-on-surface-variant">
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-primary"
                    >
                      {showPassword ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block mb-1.5 text-sm font-medium text-on-surface-variant">
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

                <p className="text-xs text-on-surface-variant">
                  Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số.
                </p>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 flex items-center justify-center rounded-[10px] text-on-primary font-medium text-lg bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md"
                >
                  {isLoading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                </button>
              </form>

              <p className="text-center text-sm text-on-surface">
                <Link
                  href="/login"
                  className="font-medium text-primary hover:underline"
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
        <div className="min-h-screen flex items-center justify-center bg-surface-container-low" />
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
