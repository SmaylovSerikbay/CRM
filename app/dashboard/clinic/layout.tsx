'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { userStore } from '@/lib/store/user-store';

export default function ClinicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const user = userStore.getCurrentUser();
    if (!user || user.role !== 'clinic') {
      router.push('/select-role');
      return;
    }

    if (!user.clinicRole) {
      // Если роль внутри клиники не выбрана - перенаправляем на выбор
      router.push('/dashboard/clinic/select-role');
      return;
    }
  }, [router]);

  return <DashboardLayout role="clinic">{children}</DashboardLayout>;
}
