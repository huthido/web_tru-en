'use client';

import Link from 'next/link';

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
                {/* Main Footer Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-12">
                    {/* Logo & About */}
                    <div className="flex flex-col gap-4 max-w-md">
                        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
                            <div className="w-[60px] h-[60px] flex items-center justify-center">
                                <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        d="M50 5L50 55L30 45.3594L10 55L10 5L50 5Z"
                                        stroke="currentColor"
                                        strokeWidth="4.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="text-gray-900 dark:text-white transition-colors duration-300"
                                    />
                                    <path
                                        d="M30 5V45.3594"
                                        stroke="currentColor"
                                        strokeWidth="4.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="text-gray-900 dark:text-white transition-colors duration-300"
                                    />
                                </svg>
                            </div>
                        </Link>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed transition-colors duration-300">
                            Nền tảng đọc truyện và sách trực tuyến hàng đầu. Khám phá thế giới văn học với hàng ngàn tác phẩm đa dạng từ các tác giả trong nước và quốc tế.
                        </p>
                    </div>

                    {/* Công việc */}
                    <div className="flex flex-col gap-5">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                            Công việc
                        </h3>
                        <nav className="flex flex-col gap-5">
                            <Link
                                href="/lien-he-quang-cao"
                                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
                            >
                                Liên hệ quảng cáo
                            </Link>
                            <Link
                                href="/doi-tac-hop-tac"
                                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
                            >
                                Đối tác hợp tác
                            </Link>
                            <Link
                                href="/dang-ky-tac-gia"
                                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
                            >
                                Đăng kí tác giả
                            </Link>
                            <Link
                                href="/gop-y-phan-anh"
                                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
                            >
                                Góp ý phản ánh
                            </Link>
                        </nav>
                    </div>

                    {/* Thông tin */}
                    <div className="flex flex-col gap-5">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                            Thông tin
                        </h3>
                        <nav className="flex flex-col gap-5">
                            <Link
                                href="/gioi-thieu"
                                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
                            >
                                Giới thiệu
                            </Link>
                            <Link
                                href="/ung-ho"
                                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
                            >
                                Ủng hộ
                            </Link>
                            <Link
                                href="/dang-ky-tac-gia"
                                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
                            >
                                Tác giả
                            </Link>
                            <Link
                                href="/ban-quyen"
                                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
                            >
                                Bản quyền
                            </Link>
                        </nav>
                    </div>

                    {/* Theo dõi */}
                    <div className="flex flex-col gap-5">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                            Theo dõi
                        </h3>
                        <nav className="flex flex-col gap-5">
                            <Link
                                href="https://facebook.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
                            >
                                <svg width="12" height="20" viewBox="0 0 12 20" fill="none" className="flex-shrink-0">
                                    <path
                                        d="M11 1H8C6.67392 1 5.40215 1.52678 4.46447 2.46447C3.52678 3.40215 3 4.67392 3 6V9H0V13H3V19H7V13H10V9H7V6C7 5.73478 7.10536 5.48043 7.29289 5.29289C7.48043 5.10536 7.73478 5 8 5H11V1Z"
                                        fill="currentColor"
                                    />
                                </svg>
                                <span>Facebook</span>
                            </Link>
                            <Link
                                href="https://tiktok.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
                            >
                                <svg width="19" height="19" viewBox="0 0 19 19" fill="none" className="flex-shrink-0">
                                    <path
                                        d="M16.5 4.5C15.8 4.9 15 5.1 14.2 5.1C14.2 6.1 14.2 7.1 14.2 8.1C13.4 8.1 12.6 7.9 11.8 7.5V11.5C11.8 13.8 9.9 15.7 7.6 15.7C5.3 15.7 3.4 13.8 3.4 11.5C3.4 9.2 5.3 7.3 7.6 7.3C8 7.3 8.4 7.4 8.8 7.5V9.3C8.4 9.1 8 9 7.6 9C6.5 9 5.6 9.9 5.6 11C5.6 12.1 6.5 13 7.6 13C8.7 13 9.6 12.1 9.6 11V0H11.8C11.8 2.3 13.7 4.2 16 4.2V4.5H16.5Z"
                                        fill="currentColor"
                                    />
                                </svg>
                                <span>TikTok</span>
                            </Link>
                            <Link
                                href="https://youtube.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
                            >
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-shrink-0">
                                    <path
                                        d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM13.5 10L8.5 7V13L13.5 10Z"
                                        fill="currentColor"
                                    />
                                </svg>
                                <span>YouTube</span>
                            </Link>
                        </nav>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-300">
                    <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                        Copyright © {currentYear}. HÙNG YÊU. Tất cả quyền được bảo lưu.
                    </p>
                    <div className="flex items-center gap-10">
                        <Link
                            href="/terms"
                            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
                        >
                            Điều khoản & Điều kiện
                        </Link>
                        <Link
                            href="/privacy"
                            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
                        >
                            Chính sách bảo mật
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

