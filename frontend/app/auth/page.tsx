'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Phone, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { userStore } from '@/lib/store/user-store';

function AuthContent() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Проверяем, не авторизован ли пользователь уже
  useEffect(() => {
    const user = userStore.getCurrentUser();
    if (user && user.registrationCompleted) {
      // Если пользователь уже авторизован и зарегистрирован - перенаправляем в дашборд
      if (user.role === 'clinic') {
        router.push('/dashboard/clinic');
      } else if (user.role === 'employer') {
        router.push('/dashboard/employer');
      }
    }
  }, [router]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await userStore.sendOTP(phone);
      setStep('otp');
    } catch (error) {
      alert('Ошибка отправки кода. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const user = await userStore.verifyOTP(phone, otp);
      
      // Всегда переходим к выбору роли после OTP
      // Если регистрация завершена, select-role проверит и перенаправит в дашборд
      router.push('/select-role');
    } catch (error: any) {
      alert(error.message || 'Неверный код. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-800">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-black dark:bg-white rounded-full mb-4">
              <MessageSquare className="h-8 w-8 text-white dark:text-black" />
            </div>
            <h1 className="text-3xl font-bold mb-2">
              {step === 'phone' 
                ? 'Вход в систему' 
                : 'Подтверждение'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {step === 'phone' 
                ? 'Введите номер телефона для получения кода через WhatsApp' 
                : 'Введите код подтверждения из WhatsApp'}
            </p>
          </div>

          {step === 'phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Номер телефона
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none z-10" />
                  <input
                    type="tel"
                    placeholder="+7 (___) ___-__-__"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
              >
                Отправить код
              </Button>
            </form>
          )}
          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <Input
                type="text"
                label="Код подтверждения"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
              >
                Подтвердить
              </Button>
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Изменить номер телефона
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Загрузка...</p>
        </div>
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}

