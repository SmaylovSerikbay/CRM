'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { User, Stethoscope, CheckCircle, FileText, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { userStore, ClinicUserRole } from '@/lib/store/user-store';

export default function ClinicSelectRolePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(userStore.getCurrentUser());

  useEffect(() => {
    const user = userStore.getCurrentUser();
    if (!user || user.role !== 'clinic') {
      router.push('/select-role');
      return;
    }

    if (!user.registrationCompleted) {
      // Если регистрация не завершена - перенаправляем на регистрацию
      router.push('/select-role');
      return;
    }

    if (user.clinicRole) {
      // Если роль уже выбрана - перенаправляем в дашборд
      router.push('/dashboard/clinic');
      return;
    }

    setCurrentUser(user);
  }, [router]);

  const handleRoleSelect = async (clinicRole: ClinicUserRole) => {
    if (currentUser) {
      try {
        await userStore.completeRegistration(
          currentUser.phone,
          'clinic',
          currentUser.registrationData,
          clinicRole
        );
        router.push('/dashboard/clinic');
      } catch (error: any) {
        alert(error.message || 'Ошибка сохранения роли. Попробуйте еще раз.');
      }
    }
  };

  const roles: { role: ClinicUserRole; title: string; description: string; icon: any; access: string[] }[] = [
    {
      role: 'manager',
      title: 'Менеджер',
      description: 'Управление календарными планами, формирование документов',
      icon: FileText,
      access: ['Календарный план', 'Заключительный акт', 'План оздоровления', 'Дашборд']
    },
    {
      role: 'profpathologist',
      title: 'Профпатолог',
      description: 'Проведение экспертизы, вынесение вердиктов',
      icon: CheckCircle,
      access: ['Экспертиза', 'Врачебная комиссия', 'Дашборд']
    },
    {
      role: 'doctor',
      title: 'Врач',
      description: 'Заполнение заключений в рамках врачебной комиссии',
      icon: Stethoscope,
      access: ['Врачебная комиссия', 'Дашборд']
    },
    {
      role: 'receptionist',
      title: 'Регистратура',
      description: 'Генерация маршрутных листов при приеме пациентов',
      icon: Users,
      access: ['Маршрутные листы', 'Дашборд']
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-4xl"
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Выберите вашу роль в клинике</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Выберите роль для доступа к соответствующим разделам
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {roles.map((roleItem, index) => {
            const Icon = roleItem.icon;
            return (
              <motion.div
                key={roleItem.role}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card
                  hover
                  className="cursor-pointer h-full flex flex-col"
                  onClick={() => handleRoleSelect(roleItem.role)}
                >
                  <div className="flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-6">
                    <Icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-3">{roleItem.title}</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 flex-grow">
                    {roleItem.description}
                  </p>
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Доступные разделы:
                    </p>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      {roleItem.access.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button variant="outline" className="w-full">
                    Выбрать
                  </Button>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

