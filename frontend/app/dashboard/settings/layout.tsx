'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { userStore } from '@/lib/store/user-store';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  
  useEffect(() => {
    const user = userStore.getCurrentUser();
    if (!user) {
      router.push('/auth');
      return;
    }
  }, [router]);

  const user = userStore.getCurrentUser();
  if (!user) {
    return null;
  }

  const role = user.role === 'clinic' ? 'clinic' : 'employer';
  return <DashboardLayout role={role}>{children}</DashboardLayout>;
}

