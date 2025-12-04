'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Phone, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { userStore } from '@/lib/store/user-store';

function AuthContent() {
  const [authMethod, setAuthMethod] = useState<'otp' | 'password'>('otp');
  const [step, setStep] = useState<'phone' | 'otp' | 'password'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
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
      if (authMethod === 'otp') {
        await userStore.sendOTP(phone);
        setStep('otp');
      } else {
        setStep('password');
      }
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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const user = await userStore.loginWithPassword(phone, password);
      
      // Проверяем, завершена ли регистрация
      if (user.registrationCompleted) {
        // Перенаправляем в соответствующий дашборд
        if (user.role === 'clinic') {
          router.push('/dashboard/clinic');
        } else if (user.role === 'employer') {
          router.push('/dashboard/employer');
        }
      } else {
        // Если регистрация не завершена, переходим к выбору роли
        router.push('/select-role');
      }
    } catch (error: any) {
      alert(error.message || 'Неверный пароль. Попробуйте еще раз.');
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
                : step === 'otp'
                ? 'Подтверждение'
                : 'Введите пароль'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {step === 'phone' 
                ? authMethod === 'otp'
                  ? 'Введите номер телефона для получения кода через WhatsApp'
                  : 'Введите номер телефона для входа'
                : step === 'otp'
                ? 'Введите код подтверждения из WhatsApp'
                : 'Введите ваш пароль для входа'}
            </p>
          </div>

          {step === 'phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              {/* Выбор метода авторизации */}
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setAuthMethod('otp')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    authMethod === 'otp'
                      ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Код через WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('password')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                    authMethod === 'password'
                      ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                  }`}
                >
                  Пароль
                </button>
              </div>

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
                {authMethod === 'otp' ? 'Отправить код' : 'Продолжить'}
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

          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <Input
                type="password"
                label="Пароль"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
              >
                Войти
              </Button>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('otp');
                    setStep('phone');
                  }}
                  className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Войти через код WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Изменить номер телефона
                </button>
              </div>
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

