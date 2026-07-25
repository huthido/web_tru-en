'use client';

import { Header } from '@/components/layouts/header';
import { Sidebar } from '@/components/layouts/sidebar';
import { Footer } from '@/components/layouts/footer';
import { ContentTabsNav } from '@/components/layouts/content-tabs-nav';
import { ArtTab } from '@/components/art/art-tab';
import { useAuth } from '@/lib/api/hooks/use-auth';

/** Trang "Mày tao" (Cộng đồng nghệ thuật) — tách khỏi tab của /truyen. */
export default function NgheThuatPage() {
  const { user, isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-surface transition-colors duration-300">
      <Sidebar />
      <div className="md:ml-60 pb-16 md:pb-0">
        <Header />
        <ContentTabsNav />
        <main className="pt-4 md:pt-8 pb-12 min-h-[calc(100vh-60px)]">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <ArtTab currentUserId={user?.id} isLoggedIn={isAuthenticated} />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
