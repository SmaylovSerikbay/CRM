'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Building2, Stethoscope, ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { userStore } from '@/lib/store/user-store';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { useToast, ToastProvider } from '@/components/ui/Toast';

function RegisterContent() {
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role') as 'clinic' | 'employer' | null;
  const [currentUser, setCurrentUser] = useState(userStore.getCurrentUser());

  useEffect(() => {
    const user = userStore.getCurrentUser();
    if (!user) {
      // Если пользователь не авторизован - перенаправляем на авторизацию
      router.push('/auth');
      return;
    }

    if (user.registrationCompleted) {
      // Если регистрация уже завершена - перенаправляем в ЛК
      if (user.role === 'clinic') {
        router.push('/dashboard/clinic');
      } else if (user.role === 'employer') {
        router.push('/dashboard/employer');
      }
      return;
    }

    setCurrentUser(user);

    // Если роль не выбрана, перенаправляем на выбор роли
    if (!role) {
      router.push('/select-role');
    } else {
      // Обновляем роль пользователя
      userStore.updateUserRole(user.phone, role);
    }
  }, [role, router]);

  const handleComplete = async (registrationData: {
    name: string;
    inn: string;
    address: string;
    contactPerson: string;
    email: string;
  }) => {
    if (currentUser) {
      try {
        // Завершаем регистрацию
        await userStore.completeRegistration(currentUser.phone, role!, registrationData);
        
        // Переходим в ЛК
        if (role === 'clinic') {
          router.push('/dashboard/clinic/select-role');
        } else if (role === 'employer') {
          router.push('/dashboard/employer');
        }
      } catch (error: any) {
        showToast(error.message || 'Ошибка регистрации. Попробуйте еще раз.', 'error');
      }
    }
  };

  if (!currentUser || !role) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-800">
          <div className="mb-6">
            <button
              onClick={() => router.push('/select-role')}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Назад к выбору роли
            </button>
          </div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-black dark:bg-white rounded-full mb-4">
              {role === 'clinic' ? (
                <Stethoscope className="h-8 w-8 text-white dark:text-black" />
              ) : (
                <Building2 className="h-8 w-8 text-white dark:text-black" />
              )}
            </div>
            <h1 className="text-3xl font-bold mb-2">Регистрация</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Заполните данные для завершения регистрации
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Телефон: {currentUser.phone}
            </p>
          </div>

          <RegisterForm role={role} phone={currentUser.phone} onComplete={handleComplete} />
        </div>
      </motion.div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <ToastProvider>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Загрузка...</p>
          </div>
        </div>
      }>
        <RegisterContent />
      </Suspense>
    </ToastProvider>
  );
}

