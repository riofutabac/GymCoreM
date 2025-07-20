// frontend/web-dashboard/src/app/(auth)/reset-password/page.tsx

'use client';

import { Suspense } from 'react';
import { ResetPasswordContent } from './ResetPasswordContent';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
