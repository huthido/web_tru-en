'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegistrationSuccessPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState('');

  // Get email from URL query params if available
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam && !email) {
      setEmail(emailParam);
    }
  }

  const handleResendEmail = async () => {
    if (!email) {
      setMessage('Vui lòng nhập email');
      return;
    }

    setIsResending(true);
    setMessage('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Email xác thực đã được gửi lại thành công');
      } else {
        setMessage(data.error || data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      setMessage('Không thể gửi email. Vui lòng thử lại sau');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-8">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700">

          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-medium text-gray-900 dark:text-white">
                  Xác thực địa chỉ email của bạn
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Đăng ký thành công
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Chúng tôi đã gửi một email xác thực đến địa chỉ email của bạn.
              Vui lòng kiểm tra hộp thư và làm theo hướng dẫn để hoàn tất quá trình đăng ký.
            </p>

            {/* Email Display */}
            {email && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                  Email đã gửi đến
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white break-all">
                  {email}
                </p>
              </div>
            )}

            {/* Instructions */}
            <div className="mb-6">
              <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Các bước tiếp theo:
              </h2>
              <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start">
                  <span className="mr-2 text-gray-400">1.</span>
                  <span>Mở hộp thư email của bạn</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-gray-400">2.</span>
                  <span>Tìm email từ Web Truyện Tiến Hùng</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-gray-400">3.</span>
                  <span>Nhấp vào nút "Xác thực email" trong email</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-gray-400">4.</span>
                  <span>Bạn sẽ được tự động đăng nhập</span>
                </li>
              </ol>
            </div>

            {/* Warning Box */}
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                    Lưu ý quan trọng
                  </p>
                  <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                    <li>• Đường dẫn xác thực có hiệu lực trong 24 giờ</li>
                    <li>• Kiểm tra cả thư mục Spam hoặc Promotions</li>
                    <li>• Email có thể mất vài phút để đến</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Resend Section */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Không nhận được email?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Kiểm tra thư mục spam hoặc yêu cầu gửi lại email xác thực
              </p>

              {!email && (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập địa chỉ email của bạn"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm mb-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}

              <button
                onClick={handleResendEmail}
                disabled={isResending || !email}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:dark:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors duration-200 flex items-center justify-center gap-2"
              >
                {isResending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <span>Gửi lại email xác thực</span>
                )}
              </button>

              {message && (
                <div className={`mt-3 p-3 rounded text-sm ${message.includes('thành công')
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                  }`}>
                  {message}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 rounded-b">
            <Link
              href="/login"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium inline-flex items-center gap-1 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Quay lại trang đăng nhập
            </Link>
          </div>
        </div>

        {/* Security Note */}
        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          Vì lý do bảo mật, đường dẫn xác thực chỉ có thể sử dụng một lần và sẽ hết hạn sau 24 giờ
        </p>
      </div>
    </div>
  );
}
