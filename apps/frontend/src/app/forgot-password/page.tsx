'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authService } from '@/lib/api/auth.service';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSubmitted(true);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Có lỗi xảy ra. Vui lòng thử lại.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface-container-low transition-colors duration-300">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col gap-5">
          <Link href="/" className="self-center">
            <h1 className="text-2xl font-bold text-on-surface">HÙNG YÊU</h1>
          </Link>

          {submitted ? (
            <div className="flex flex-col gap-4 text-center">
              <h2 className="text-2xl font-bold text-on-surface">Kiểm tra email</h2>
              <p className="text-on-surface-variant">
                Nếu email <strong className="text-on-surface">{email}</strong> tồn
                tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu. Vui lòng kiểm tra hộp
                thư (kể cả mục spam). Link có hiệu lực trong 1 giờ.
              </p>
              <Link
                href="/login"
                className="w-full h-12 flex items-center justify-center rounded-[10px] text-white font-medium bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 transition-all duration-300 shadow-md"
              >
                Quay lại đăng nhập
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-on-surface">Quên mật khẩu</h2>
              <p className="text-sm text-on-surface-variant">
                Nhập email tài khoản của bạn. Chúng tôi sẽ gửi link để đặt lại mật khẩu.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {error && (
                  <div className="px-4 py-3 rounded-lg border border-red-500 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block mb-1.5 text-sm font-medium text-on-surface-variant">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="email@example.com"
                    className="w-full h-12 px-3 rounded-[10px] border-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-blue-500 transition-all duration-300 bg-surface-container border-outline-variant text-on-surface placeholder:text-on-surface-variant"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 flex items-center justify-center rounded-[10px] text-white font-medium text-lg bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md"
                >
                  {isLoading ? 'Đang gửi...' : 'Gửi link đặt lại'}
                </button>
              </form>

              <p className="text-center text-sm text-on-surface">
                Nhớ mật khẩu rồi?{' '}
                <Link
                  href="/login"
                  className="font-medium text-primary hover:underline"
                >
                  Đăng nhập
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
