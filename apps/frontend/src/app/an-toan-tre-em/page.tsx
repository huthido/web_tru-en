'use client';

import { Suspense } from 'react';
import { PageContent } from '@/components/pages/page-content';
import { Loading } from '@/components/ui/loading';

function ChildSafetyContent() {
  return <PageContent slug="child-safety" fallbackTitle="Tiêu chuẩn an toàn cho trẻ em" />;
}

export default function ChildSafetyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loading />
      </div>
    }>
      <ChildSafetyContent />
    </Suspense>
  );
}
