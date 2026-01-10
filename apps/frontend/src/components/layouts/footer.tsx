'use client';

import Link from 'next/link';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { ImageSizes } from '@/utils/image-utils';
import { Facebook, Twitter, Youtube, Instagram } from 'lucide-react';
import { SiX, SiTiktok, SiLinkedin, SiThreads } from 'react-icons/si';

import { useSettings } from '@/lib/api/hooks/use-settings';

export function Footer() {
    const currentYear = new Date().getFullYear();
    const { data: settings } = useSettings();

    return (
        <footer className="w-full bg-[#FDF2F8] dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
                {/* Main Footer Content */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
                    {/* Logo & About */}
                    <div className="flex flex-col gap-5">
                        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
                            <div className="relative w-[60px] h-[60px] min-h-[60px] flex-shrink-0 flex items-center justify-center" style={{ minHeight: '60px' }}>
                                {settings?.siteLogo ? (
                                    <OptimizedImage
                                        src={settings.siteLogo}
                                        alt={settings.siteName || 'Logo'}
                                        fill
                                        objectFit="contain"
                                        sizes={ImageSizes.logo}
                                        quality={90}
                                        placeholder="blur"
                                    />
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
                        {/* Mô tả website */}
                        {settings?.siteDescription && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                {settings.siteDescription}
                            </p>
                        )}
                    </div>

                    {/* Công việc */}
                    <div className="flex flex-col gap-5 ">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300 mb-1">
                            Công việc
                        </h3>
                        <nav className="flex flex-col gap-4">
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
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300 mb-1">
                            Thông tin
                        </h3>
                        <nav className="flex flex-col gap-4">
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
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors duration-300 mb-1">
                            Theo dõi
                        </h3>
                        <nav className="flex flex-col gap-4">
                            {settings?.siteFacebook && (
                                <Link
                                    href={settings.siteFacebook}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300 group"
                                >
                                    <Facebook className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                                    <span>Facebook</span>
                                </Link>
                            )}
                            {settings?.siteTwitter && (
                                <Link
                                    href={settings.siteTwitter}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300 group"
                                >
                                    <Twitter className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                                    <span>Twitter</span>
                                </Link>
                            )}
                            {settings?.siteX && (
                                <Link
                                    href={settings.siteX}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300 group"
                                >
                                    <SiX className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                                    <span>X (Twitter)</span>
                                </Link>
                            )}
                            {settings?.siteYoutube && (
                                <Link
                                    href={settings.siteYoutube}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300 group"
                                >
                                    <Youtube className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                                    <span>YouTube</span>
                                </Link>
                            )}
                            {settings?.siteInstagram && (
                                <Link
                                    href={settings.siteInstagram}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300 group"
                                >
                                    <Instagram className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                                    <span>Instagram</span>
                                </Link>
                            )}
                            {settings?.siteTikTok && (
                                <Link
                                    href={settings.siteTikTok}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300 group"
                                >
                                    <SiTiktok className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                                    <span>TikTok</span>
                                </Link>
                            )}
                            {settings?.siteLinkedIn && (
                                <Link
                                    href={settings.siteLinkedIn}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300 group"
                                >
                                    <SiLinkedin className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                                    <span>LinkedIn</span>
                                </Link>
                            )}
                            {settings?.siteThreads && (
                                <Link
                                    href={settings.siteThreads}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-300 group"
                                >
                                    <SiThreads className="w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                                    <span>Threads</span>
                                </Link>
                            )}
                            {!settings?.siteFacebook && !settings?.siteTwitter && !settings?.siteX && !settings?.siteYoutube && !settings?.siteInstagram && !settings?.siteTikTok && !settings?.siteLinkedIn && !settings?.siteThreads && (
                                <p className="text-sm text-gray-500 dark:text-gray-500">Chưa có liên kết mạng xã hội</p>
                            )}
                        </nav>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors duration-300">
                    <p className="text-sm text-center sm:text-left text-gray-600 dark:text-gray-400 transition-colors duration-300">
                        Copyright © {currentYear}. {settings?.siteName || 'Web Truyen Tien Hung'}. Tất cả quyền được bảo lưu.
                    </p>
                    <div className="flex items-center gap-6 sm:gap-10 flex-wrap justify-center sm:justify-end">
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

