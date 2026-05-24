import type { Metadata, Viewport } from 'next';
import { Inter, Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import InstallPrompt from '@/components/pwa/install-prompt';
import { QueryProvider } from '@/components/providers/query-provider';
import { AuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/components/providers/toast-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { MaintenanceCheck } from '@/components/maintenance-check';
import { getServerSettings } from '@/lib/api/server-settings';
import { AdsConsentProvider } from '@/lib/ads/consent-context';
import { ConsentBanner } from '@/components/ads/consent-banner';
import { AdsenseScript } from '@/components/ads/adsense-script';

// Body / UI font — Inter (full Vietnamese support).
const fontBody = Inter({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

// Headline font — Be Vietnam Pro (Vivid Reader's grotesk display, Vietnamese-native).
const fontDisplay = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

// Default metadata values (fallback)
const DEFAULT_METADATA = {
  siteName: 'YÊU',
  siteDescription: 'Nền tảng đọc truyện và tiểu thuyết trực tuyến. Khám phá hàng ngàn câu chuyện hay, đa dạng thể loại từ kiếm hiệp, tiên hiệp, ngôn tình đến khoa học viễn tưởng.',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://hungyeu.com',
  keywords: ['truyện', 'tiểu thuyết', 'đọc truyện', 'truyện online', 'manga', 'light novel', 'kiếm hiệp', 'tiên hiệp', 'ngôn tình'],
  author: 'YÊU',
};

// Generate metadata dynamically from settings
export async function generateMetadata(): Promise<Metadata> {
  // Fetch settings from API
  const settings = await getServerSettings();

  // Use settings if available, otherwise use defaults
  const siteName = settings?.siteName || DEFAULT_METADATA.siteName;
  const siteDescription = settings?.siteDescription || DEFAULT_METADATA.siteDescription;
  const siteUrl = DEFAULT_METADATA.siteUrl;
  const siteLogo = settings?.siteLogo;
  const siteFavicon = settings?.siteFavicon;

  return {
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description: siteDescription,
    keywords: DEFAULT_METADATA.keywords,
    authors: [{ name: DEFAULT_METADATA.author }],
    creator: DEFAULT_METADATA.author,
    publisher: DEFAULT_METADATA.author,
    icons: {
      // Mặc định: favicon trái tim (public/favicon-heart.svg) — hợp brand "YÊU".
      // Admin có thể ghi đè bằng cách đặt siteFavicon trong Cài đặt.
      icon: siteFavicon
        ? [{ url: siteFavicon, type: 'image/png' }]
        : [{ url: '/favicon-heart.svg', type: 'image/svg+xml' }],
      shortcut: siteFavicon
        ? [{ url: siteFavicon, type: 'image/png' }]
        : [{ url: '/favicon-heart.svg', type: 'image/svg+xml' }],
      apple: siteFavicon ? [{ url: siteFavicon, type: 'image/png' }] : undefined,
    },
    openGraph: {
      type: 'website',
      locale: 'vi_VN',
      url: siteUrl,
      siteName: siteName,
      title: `${siteName} - Nền tảng đọc truyện trực tuyến`,
      description: siteDescription,
      images: siteLogo ? [{ url: siteLogo, alt: siteName }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: siteName,
      description: siteDescription,
      images: siteLogo ? [siteLogo] : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${fontBody.variable} ${fontDisplay.variable}`}>
      <head>
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        {/* Light surface là mặc định; script trong <body> đổi sang màu tối nếu cần. */}
        <meta name="theme-color" content="#fff8f7" />
        {/* Web App Manifest spec — Chrome / Edge / Firefox. */}
        <meta name="mobile-web-app-capable" content="yes" />
        {/* iOS Safari vẫn cần apple-* tag để add-to-homescreen hoạt động. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="YÊU" />
        <link rel="apple-touch-icon" href="/HUNGYEULOGO.png" />
        {/*
          AdSense script chuyển sang component <AdsenseScript /> trong <body>
          để dùng next/script + đọc publisher ID động từ Settings + GDPR consent.
          KHÔNG còn hard-code publisher ID ở đây.
        */}
      </head>
      <body className={fontBody.className}>
        {/* Áp theme đã lưu TRƯỚC khi <body> paint để tránh nháy sáng (FOUC).
            Đặt làm con đầu của <body> (không phải <head>): trình duyệt chạy
            ngay khi parse tới, và React reconcile <script> trong body bình
            thường nên không gây hydration mismatch như khi đặt trong <head>. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||'light';var d=t==='dark';if(d)document.documentElement.classList.add('dark');var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',d?'#0b1326':'#fff8f7');}catch(e){}})();`,
          }}
        />
        <ErrorBoundary>
          <QueryProvider>
            <AuthProvider>
              <ThemeProvider defaultTheme="light">
                <ToastProvider>
                  <AdsConsentProvider>
                    <MaintenanceCheck>
                      {children}
                    </MaintenanceCheck>
                    <ConsentBanner />
                    <AdsenseScript />
                  </AdsConsentProvider>
                </ToastProvider>
              </ThemeProvider>
            </AuthProvider>
          </QueryProvider>
        </ErrorBoundary>
        <InstallPrompt />
      </body>
    </html>
  );
}

