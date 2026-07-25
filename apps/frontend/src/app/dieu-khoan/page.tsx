'use client';

import { Suspense } from 'react';
import { PageContent } from '@/components/pages/page-content';
import { Loading } from '@/components/ui/loading';

function TermsContent() {
  return <PageContent slug="terms" fallbackTitle="Điều khoản & Điều kiện" />;
}

export default function TermsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loading />
      </div>
    }>
      <TermsContent />
    </Suspense>
  );
}

