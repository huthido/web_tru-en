'use client';

import { Suspense } from 'react';
import { PageContent } from '@/components/pages/page-content';
import { Loading } from '@/components/ui/loading';

function AuthorRegistrationContent() {
  return <PageContent slug="dang-ky-tac-gia" fallbackTitle="Đăng kí tác giả" />;
}

export default function AuthorRegistrationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loading />
      </div>
    }>
      <AuthorRegistrationContent />
    </Suspense>
  );
}

