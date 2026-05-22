'use client';

import { Suspense } from 'react';
import { PageContent } from '@/components/pages/page-content';
import { Loading } from '@/components/ui/loading';

function FeedbackContent() {
  return <PageContent slug="gop-y-phan-anh" fallbackTitle="Góp ý phản ánh" />;
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loading />
      </div>
    }>
      <FeedbackContent />
    </Suspense>
  );
}

