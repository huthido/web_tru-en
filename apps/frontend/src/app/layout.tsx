import type { Metadata, Viewport } from 'next';
import { Quicksand } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import InstallPrompt from '@/components/pwa/install-prompt';
import { QueryProvider } from '@/components/providers/query-provider';
import { AuthProvider } from '@/contexts/auth-context';
import { ToastProvider } from '@/components/providers/toast-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { MaintenanceCheck } from '@/components/maintenance-check';
import { getServerSettings } from '@/lib/api/server-settings';

const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-quicksand',
  display: 'swap', // Prevent font preload warnings - ensures font doesn't block rendering
});

// Default metadata values (fallback)
const DEFAULT_METADATA = {
  siteName: 'Web Truyện HungYeu',
  siteDescription: 'Nền tảng đọc truyện và tiểu thuyết trực tuyến. Khám phá hàng ngàn câu chuyện hay, đa dạng thể loại từ kiếm hiệp, tiên hiệp, ngôn tình đến khoa học viễn tưởng.',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://hungyeu.com',
  keywords: ['truyện', 'tiểu thuyết', 'đọc truyện', 'truyện online', 'manga', 'light novel', 'kiếm hiệp', 'tiên hiệp', 'ngôn tình'],
  author: 'Web Truyện HungYeu Team',
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
      icon: siteFavicon ? [{ url: siteFavicon, type: 'image/png' }] : undefined,
      shortcut: siteFavicon ? [{ url: siteFavicon, type: 'image/png' }] : undefined,
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
    <html lang="vi" suppressHydrationWarning className={quicksand.variable}>
      <head>
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ec4899" />
        {/* Web App Manifest spec — Chrome / Edge / Firefox. */}
        <meta name="mobile-web-app-capable" content="yes" />
        {/* iOS Safari vẫn cần apple-* tag để add-to-homescreen hoạt động. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="HungYeu" />
        <link rel="apple-touch-icon" href="/HUNGYEULOGO.png" />
        {/* 🔥 Google AdSense Script - Must be in HTML tĩnh để Google bot có thể verify */}
        {/* Script tag này sẽ được render trực tiếp vào HTML tĩnh, Google bot sẽ thấy được */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1741637952321960"
          crossOrigin="anonymous"
        />
      </head>
      <body className={quicksand.className}>
        <ErrorBoundary>
          <QueryProvider>
            <AuthProvider>
              <ThemeProvider attribute="class" defaultTheme="light">
                <ToastProvider>
                  <MaintenanceCheck>
                    {children}
                  </MaintenanceCheck>
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

