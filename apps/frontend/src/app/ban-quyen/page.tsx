'use client';

import { Suspense } from 'react';
import { PageContent } from '@/components/pages/page-content';
import { Loading } from '@/components/ui/loading';

function CopyrightContent() {
  return <PageContent slug="ban-quyen" fallbackTitle="Bản quyền" />;
}

export default function CopyrightPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loading />
      </div>
    }>
      <CopyrightContent />
    </Suspense>
  );
}

