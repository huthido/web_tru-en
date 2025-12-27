'use client';

import { Suspense } from 'react';
import { PageContent } from '@/components/pages/page-content';
import { Loading } from '@/components/ui/loading';

function PrivacyContent() {
  return <PageContent slug="privacy" fallbackTitle="Chính sách bảo mật" />;
}

export default function PrivacyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FFF2F8] dark:bg-gray-900 flex items-center justify-center">
        <Loading />
      </div>
    }>
      <PrivacyContent />
    </Suspense>
  );
}

