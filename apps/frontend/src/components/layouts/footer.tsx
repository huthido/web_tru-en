'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSettings } from '@/lib/api/hooks/use-settings';

export function Footer() {
    const currentYear = new Date().getFullYear();
    const { data: settings } = useSettings();

    return (
        <footer className="w-full bg-[#FDF2F8] dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
                {/* Main Footer Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-12">
                    {/* Logo & About */}
                    <div className="flex flex-col gap-4 max-w-md">
                        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
                            <div className="w-[60px] h-[60px] flex items-center justify-center">
                                {settings?.siteLogo ? (
                                    <div className="relative w-full h-full">
                                        <Image
                                            src={settings.siteLogo}
                                            alt={settings.siteName || 'Logo'}
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                ) : (
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
                                )}
                            </div>
                        </Link>
                        {/* Thông tin liên hệ */}
                        {(settings?.siteEmail || settings?.sitePhone || settings?.siteAddress) && (
                            <div className="flex flex-col gap-2 mt-2">
                                {settings.siteEmail && (
                                    <a
                                        href={`mailto:${settings.siteEmail}`}
                                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
                                    >
                                        📧 {settings.siteEmail}
                                    </a>
                                )}
                                {settings.sitePhone && (
                                    <a
                                        href={`tel:${settings.sitePhone}`}
                                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
                                    >
                                        📞 {settings.sitePhone}
                                    </a>
                                )}
                                {settings.siteAddress && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        📍 {settings.siteAddress}
                                    </p>
                                )}
                            </div>
                        )}
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
                            {settings?.siteFacebook && (
                                <Link
                                    href={settings.siteFacebook}
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
                            )}
                            {settings?.siteTwitter && (
                                <Link
                                    href={settings.siteTwitter}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
                                >
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-shrink-0">
                                        <path
                                            d="M18.3333 4.99999C17.5833 5.33333 16.7833 5.54166 15.95 5.62499C16.8083 5.10833 17.475 4.33333 17.8083 3.39999C17 3.87499 16.1083 4.20833 15.1583 4.37499C14.3917 3.58333 13.3167 3.08333 12.1167 3.08333C9.89167 3.08333 8.08333 4.89166 8.08333 7.11666C8.08333 7.39999 8.11667 7.67499 8.175 7.93333C5.65833 7.80833 3.40833 6.58333 1.83333 4.66666C1.525 7.12499 2.80833 9.33333 4.70833 10.1667C4.00833 10.35 3.25833 10.4167 2.5 10.25C2.25 11.3333 1.33333 12.1667 0.25 12.1667C-0.0833333 12.1667 -0.416667 12.1333 -0.75 12.0833C0.25 12.9167 1.45833 13.5 2.79167 13.5C6.16667 13.5 8.58333 11.25 8.58333 8.33333C8.58333 8.20833 8.58333 8.08333 8.575 7.95833C9.33333 7.41666 9.975 6.70833 10.4583 5.87499C9.79167 6.16666 9.075 6.37499 8.33333 6.49999C9.08333 6.04166 9.65 5.33333 9.975 4.49999C9.25833 4.91666 8.45833 5.20833 7.60833 5.37499C6.91667 4.66666 5.95833 4.20833 4.875 4.20833C2.75 4.20833 1.04167 5.91666 1.04167 8.04166C1.04167 8.45833 1.09167 8.86666 1.18333 9.24999C0.833333 9.16666 0.5 9.04166 0.191667 8.87499C0.125 8.45833 0.0833333 8.03333 0.0833333 7.59999C0.0833333 5.83333 1.25 4.33333 2.83333 3.66666C2.19167 3.66666 1.6 3.83333 1.09167 4.12499C0.583333 4.41666 0.191667 4.83333 -0.0833333 5.33333C-0.0833333 5.33333 -0.0833333 5.33333 -0.0833333 5.33333C-0.0833333 5.33333 0.416667 5.33333 0.916667 5.20833C0.416667 5.33333 -0.0416667 5.49999 -0.458333 5.70833C-0.0416667 5.58333 0.333333 5.41666 0.666667 5.20833C0.333333 5.33333 -0.0416667 5.49999 -0.416667 5.62499C-0.0416667 5.83333 0.333333 6.04166 0.666667 6.20833C0.333333 6.33333 -0.0416667 6.49999 -0.416667 6.62499C-0.0416667 6.83333 0.333333 7.04166 0.666667 7.20833C0.333333 7.33333 -0.0416667 7.49999 -0.416667 7.62499C-0.0416667 7.83333 0.333333 8.04166 0.666667 8.20833C0.333333 8.33333 -0.0416667 8.49999 -0.416667 8.62499C-0.0416667 8.83333 0.333333 9.04166 0.666667 9.20833C0.333333 9.33333 -0.0416667 9.49999 -0.416667 9.62499"
                                            fill="currentColor"
                                        />
                                    </svg>
                                    <span>Twitter</span>
                                </Link>
                            )}
                            {settings?.siteYoutube && (
                                <Link
                                    href={settings.siteYoutube}
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
                            )}
                            {settings?.siteInstagram && (
                                <Link
                                    href={settings.siteInstagram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300"
                                >
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-shrink-0">
                                        <path
                                            d="M10 1.5C7.5 1.5 7.2 1.5 6.5 1.5C5.8 1.5 5.2 1.6 4.7 1.7C4.2 1.8 3.8 1.9 3.4 2.1C3 2.3 2.6 2.5 2.3 2.8C2 3.1 1.8 3.5 1.6 3.9C1.4 4.3 1.3 4.7 1.2 5.2C1.1 5.7 1 6.3 1 7C1 7.7 1 8 1 10.5C1 13 1 13.3 1 14C1 14.7 1.1 15.3 1.2 15.8C1.3 16.3 1.4 16.7 1.6 17.1C1.8 17.5 2 17.9 2.3 18.2C2.6 18.5 3 18.7 3.4 18.9C3.8 19.1 4.2 19.2 4.7 19.3C5.2 19.4 5.8 19.5 6.5 19.5C7.2 19.5 7.5 19.5 10 19.5C12.5 19.5 12.8 19.5 13.5 19.5C14.2 19.5 14.8 19.4 15.3 19.3C15.8 19.2 16.2 19.1 16.6 18.9C17 18.7 17.4 18.5 17.7 18.2C18 17.9 18.2 17.5 18.4 17.1C18.6 16.7 18.7 16.3 18.8 15.8C18.9 15.3 19 14.7 19 14C19 13.3 19 13 19 10.5C19 8 19 7.7 19 7C19 6.3 18.9 5.7 18.8 5.2C18.7 4.7 18.6 4.3 18.4 3.9C18.2 3.5 18 3.1 17.7 2.8C17.4 2.5 17 2.3 16.6 2.1C16.2 1.9 15.8 1.8 15.3 1.7C14.8 1.6 14.2 1.5 13.5 1.5C12.8 1.5 12.5 1.5 10 1.5ZM10 3.5C12.4 3.5 12.7 3.5 13.4 3.5C14 3.5 14.4 3.6 14.7 3.7C15 3.8 15.2 3.9 15.4 4.1C15.6 4.3 15.7 4.5 15.8 4.8C15.9 5.1 16 5.5 16 6.1C16 6.8 16 7.1 16 9.5C16 11.9 16 12.2 16 12.9C16 13.5 15.9 13.9 15.8 14.2C15.7 14.5 15.6 14.7 15.4 14.9C15.2 15.1 15 15.2 14.7 15.3C14.4 15.4 14 15.5 13.4 15.5C12.7 15.5 12.4 15.5 10 15.5C7.6 15.5 7.3 15.5 6.6 15.5C6 15.5 5.6 15.4 5.3 15.3C5 15.2 4.8 15.1 4.6 14.9C4.4 14.7 4.3 14.5 4.2 14.2C4.1 13.9 4 13.5 4 12.9C4 12.2 4 11.9 4 9.5C4 7.1 4 6.8 4 6.1C4 5.5 4.1 5.1 4.2 4.8C4.3 4.5 4.4 4.3 4.6 4.1C4.8 3.9 5 3.8 5.3 3.7C5.6 3.6 6 3.5 6.6 3.5C7.3 3.5 7.6 3.5 10 3.5ZM10 6.5C8.1 6.5 6.5 8.1 6.5 10C6.5 11.9 8.1 13.5 10 13.5C11.9 13.5 13.5 11.9 13.5 10C13.5 8.1 11.9 6.5 10 6.5ZM10 12.5C9.1 12.5 8.5 11.9 8.5 11C8.5 10.1 9.1 9.5 10 9.5C10.9 9.5 11.5 10.1 11.5 11C11.5 11.9 10.9 12.5 10 12.5ZM13.5 6.5C13.2 6.5 13 6.7 13 7C13 7.3 13.2 7.5 13.5 7.5C13.8 7.5 14 7.3 14 7C14 6.7 13.8 6.5 13.5 6.5Z"
                                            fill="currentColor"
                                        />
                                    </svg>
                                    <span>Instagram</span>
                                </Link>
                            )}
                            {!settings?.siteFacebook && !settings?.siteTwitter && !settings?.siteYoutube && !settings?.siteInstagram && (
                                <p className="text-sm text-gray-500 dark:text-gray-500">Chưa có liên kết mạng xã hội</p>
                            )}
                        </nav>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors duration-300">
                    <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
                        Copyright © {currentYear}. {settings?.siteName || 'Web Truyen Tien Hung'}. Tất cả quyền được bảo lưu.
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

