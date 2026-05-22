'use client';

import { Suspense } from 'react';
import { PageContent } from '@/components/pages/page-content';
import { Loading } from '@/components/ui/loading';

function AboutContent() {
  return <PageContent slug="gioi-thieu" fallbackTitle="Giới thiệu" />;
}

export default function AboutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loading />
      </div>
    }>
      <AboutContent />
    </Suspense>
  );
}

