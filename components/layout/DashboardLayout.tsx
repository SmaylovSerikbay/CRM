'use client';

import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: 'clinic' | 'employer';
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar role={role} />
      <main className="flex-1 ml-64 min-h-screen bg-gray-50 dark:bg-gray-950">
        {children}
      </main>
    </div>
  );
}

