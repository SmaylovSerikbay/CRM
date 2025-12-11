'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { 
  LayoutDashboard, 
  Stethoscope, 
  Calendar, 
  FileText, 
  Users, 
  CheckCircle,
  AlertTriangle,
  Building2,
  UserPlus,
  Settings,
  ChevronDown,
  LogOut,
  FlaskConical,
  Activity,
  Send,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { userStore, ClinicUserRole } from '@/lib/store/user-store';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { ThemeToggle } from '@/components/theme-toggle';

interface MenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface SidebarProps {
  role: 'clinic' | 'employer';
}

export function Sidebar({ role }: SidebarProps) {
  const { showToast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const [clinicRole, setClinicRole] = useState<ClinicUserRole | undefined>();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Закрываем dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRoleDropdown(false);
      }
    };

    if (showRoleDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRoleDropdown]);

  useEffect(() => {
    if (role === 'clinic') {
      const user = userStore.getCurrentUser();
      if (user?.clinicRole) {
        setClinicRole(user.clinicRole);
      } else {
        // Если роль не выбрана - перенаправляем на выбор роли
        if (typeof window !== 'undefined' && !pathname.includes('/select-role')) {
          window.location.href = '/dashboard/clinic/select-role';
        }
      }
    }
  }, [role, pathname]);

  const handleRoleChange = async (newRole: ClinicUserRole) => {
    const user = userStore.getCurrentUser();
    if (user) {
      try {
        await userStore.updateClinicRole(user.phone, newRole);
        setClinicRole(newRole);
        setShowRoleDropdown(false);
        // Перезагружаем страницу для обновления меню
        window.location.reload();
      } catch (error: any) {
        showToast(error.message || 'Ошибка изменения роли', 'error');
      }
    }
  };

  const getRoleLabel = (role?: ClinicUserRole): string => {
    const labels: Record<ClinicUserRole, string> = {
      manager: 'Менеджер',
      profpathologist: 'Профпатолог',
      doctor: 'Врач',
      receptionist: 'Регистратура',
    };
    return role ? labels[role] : 'Выберите роль';
  };

  // Базовое меню для клиники (все разделы)
  const allClinicMenu: MenuItem[] = [
    { title: 'Дашборд', href: '/dashboard/clinic', icon: LayoutDashboard },
    { title: 'Договоры', href: '/dashboard/clinic/contracts', icon: FileText },
    { title: 'Врачи', href: '/dashboard/clinic/doctors', icon: Stethoscope },
    { title: 'Электронная очередь', href: '/dashboard/clinic/queue', icon: Clock },
    { title: 'История осмотров', href: '/dashboard/clinic/patient-history', icon: Calendar },
    { title: 'Лабораторные исследования', href: '/dashboard/clinic/laboratory-tests', icon: FlaskConical },
    { title: 'Функциональные исследования', href: '/dashboard/clinic/functional-tests', icon: Activity },
    { title: 'Врачебная комиссия', href: '/dashboard/clinic/medical-commission', icon: Users },
    { title: 'Экспертиза', href: '/dashboard/clinic/expertise', icon: CheckCircle },
    { title: 'Направления', href: '/dashboard/clinic/referrals', icon: Send },
    { title: 'Сводный отчет', href: '/dashboard/clinic/summary-report', icon: FileText },
    { title: 'Заключительный акт', href: '/dashboard/clinic/final-act', icon: FileText },
    { title: 'План оздоровления', href: '/dashboard/clinic/health-plan', icon: AlertTriangle },
  ];

  // Фильтруем меню в зависимости от роли внутри клиники
  const getClinicMenu = (): MenuItem[] => {
    if (!clinicRole) return allClinicMenu;

    const roleAccess: Record<ClinicUserRole, string[]> = {
      manager: ['/dashboard/clinic', '/dashboard/clinic/contracts', '/dashboard/clinic/doctors', '/dashboard/clinic/queue', '/dashboard/clinic/patient-history', '/dashboard/clinic/laboratory-tests', '/dashboard/clinic/functional-tests', '/dashboard/clinic/summary-report', '/dashboard/clinic/final-act', '/dashboard/clinic/health-plan', '/dashboard/clinic/referrals'],
      profpathologist: ['/dashboard/clinic', '/dashboard/clinic/expertise', '/dashboard/clinic/medical-commission', '/dashboard/clinic/queue', '/dashboard/clinic/patient-history', '/dashboard/clinic/laboratory-tests', '/dashboard/clinic/functional-tests', '/dashboard/clinic/summary-report', '/dashboard/clinic/referrals'],
      doctor: ['/dashboard/clinic', '/dashboard/clinic/medical-commission', '/dashboard/clinic/queue', '/dashboard/clinic/patient-history', '/dashboard/clinic/laboratory-tests', '/dashboard/clinic/functional-tests'],
      receptionist: ['/dashboard/clinic', '/dashboard/clinic/queue', '/dashboard/clinic/patient-history', '/dashboard/clinic/medical-commission', '/dashboard/clinic/laboratory-tests', '/dashboard/clinic/functional-tests'],
    };

    const allowedPaths = roleAccess[clinicRole];
    return allClinicMenu.filter(item => allowedPaths.includes(item.href));
  };

  const clinicMenu = getClinicMenu();

  const employerMenu: MenuItem[] = [
    { title: 'Дашборд', href: '/dashboard/employer', icon: LayoutDashboard },
    { title: 'Договоры', href: '/dashboard/employer/contracts', icon: FileText },
    { title: 'Сотрудники', href: '/dashboard/employer/employees', icon: UserPlus },
    { title: 'Календарный план', href: '/dashboard/employer/calendar-plan', icon: Calendar },
    { title: 'План оздоровления', href: '/dashboard/employer/health-improvement-plan', icon: FileText },
    { title: 'Рекомендации', href: '/dashboard/employer/recommendations', icon: CheckCircle },
  ];

  const menu = role === 'clinic' ? clinicMenu : employerMenu;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-40">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold mb-2">
            {role === 'clinic' ? 'Клиника' : 'Работодатель'}
          </h2>
          {role === 'clinic' && clinicRole && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-gray-700 dark:text-gray-300">{getRoleLabel(clinicRole)}</span>
                <ChevronDown className={cn('h-4 w-4 text-gray-500 transition-transform', showRoleDropdown && 'rotate-180')} />
              </button>
              {showRoleDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg z-50 overflow-hidden">
                  {(['manager', 'profpathologist', 'doctor', 'receptionist'] as ClinicUserRole[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => handleRoleChange(r)}
                      className={cn(
                        'w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors first:rounded-t-lg last:rounded-b-lg',
                        clinicRole === r && 'bg-black dark:bg-white text-white dark:text-black font-medium'
                      )}
                    >
                      {getRoleLabel(r)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {menu.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || 
                (item.href !== '/dashboard/clinic' && item.href !== '/dashboard/employer' && 
                 pathname.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                      'hover:bg-gray-100 dark:hover:bg-gray-800',
                      isActive 
                        ? 'bg-black dark:bg-white text-white dark:text-black font-medium' 
                        : 'text-gray-700 dark:text-gray-300'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.title}</span>
                    {item.badge && (
                      <span className="ml-auto px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Settings and Logout */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-1">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-gray-700 dark:text-gray-300">Тема</span>
            <ThemeToggle />
          </div>
          <Link
            href="/dashboard/settings"
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'text-gray-700 dark:text-gray-300'
            )}
          >
            <Settings className="h-5 w-5" />
            <span>Настройки</span>
          </Link>
          <button
            onClick={() => {
              userStore.logout();
              router.push('/');
            }}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'text-gray-700 dark:text-gray-300'
            )}
          >
            <LogOut className="h-5 w-5" />
            <span>Выйти</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

