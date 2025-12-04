'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Building2, Stethoscope, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { userStore } from '@/lib/store/user-store';
import { useEffect, useState } from 'react';

export default function SelectRolePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(userStore.getCurrentUser());

  useEffect(() => {
    // Проверяем, есть ли уже авторизованный пользователь
    const user = userStore.getCurrentUser();
    if (!user) {
      // Если пользователь не авторизован - перенаправляем на страницу авторизации
      router.push('/auth');
      return;
    }
    
    if (user && user.registrationCompleted) {
      // Если регистрация завершена - перенаправляем в ЛК
      if (user.role === 'clinic') {
        router.push('/dashboard/clinic');
      } else if (user.role === 'employer') {
        router.push('/dashboard/employer');
      }
    } else {
      setCurrentUser(user);
    }
  }, [router]);

  const handleRoleSelect = (role: 'clinic' | 'employer') => {
    const user = userStore.getCurrentUser();
    if (user) {
      // Обновляем роль пользователя
      userStore.updateUserRole(user.phone, role);
    }
    // Переходим на страницу регистрации
    router.push(`/register?role=${role}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-4xl"
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Выберите роль</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Выберите тип вашей организации для продолжения работы
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card
              hover
              className="cursor-pointer h-full flex flex-col"
              onClick={() => handleRoleSelect('clinic')}
            >
              <div className="flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-6">
                <Stethoscope className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-semibold mb-3">Клиника</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 flex-grow">
                Управление медицинскими осмотрами, ведение пациентов, 
                формирование документов и отчетности
              </p>
              <Button variant="outline" className="w-full group">
                Войти как клиника
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card
              hover
              className="cursor-pointer h-full flex flex-col"
              onClick={() => handleRoleSelect('employer')}
            >
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-6">
                <Building2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-semibold mb-3">Работодатель</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 flex-grow">
                Управление списком сотрудников, отслеживание статусов осмотров, 
                календарное планирование
              </p>
              <Button variant="outline" className="w-full group">
                Войти как работодатель
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

