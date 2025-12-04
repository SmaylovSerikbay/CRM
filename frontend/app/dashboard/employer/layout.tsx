import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout role="employer">{children}</DashboardLayout>;
}

