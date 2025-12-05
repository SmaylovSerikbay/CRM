'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Shield, Users, FileText, Calendar, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { userStore } from '@/lib/store/user-store';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LandingPage() {
  const router = useRouter();

  // Проверяем, не авторизован ли пользователь уже
  useEffect(() => {
    const user = userStore.getCurrentUser();
    if (user && user.registrationCompleted) {
      // Если пользователь уже авторизован - перенаправляем в дашборд
      if (user.role === 'clinic') {
        router.push('/dashboard/clinic');
      } else if (user.role === 'employer') {
        router.push('/dashboard/employer');
      }
    }
  }, [router]);
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-semibold">MedCRM</div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/auth">
              <Button variant="ghost" size="sm">Войти</Button>
            </Link>
            <Link href="/auth">
              <Button size="sm">Начать</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-6xl md:text-7xl font-bold mb-6 tracking-tight">
              Управление медицинскими
              <br />
              <span className="text-gray-500">осмотрами</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              Современная платформа для клиник и работодателей. 
              Автоматизация процессов, прозрачность и соответствие всем требованиям.
            </p>
            <div className="flex items-center justify-center gap-4">
            <Link href="/auth">
              <Button size="lg" className="group">
                Начать работу
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                icon: <FileText className="h-8 w-8" />,
                title: 'Список контингента',
                description: 'Загрузка и автоматическое распределение сотрудников по вредным факторам',
              },
              {
                icon: <Calendar className="h-8 w-8" />,
                title: 'Календарный план',
                description: 'Автоматическое планирование осмотров с учетом загрузки клиники',
              },
              {
                icon: <Users className="h-8 w-8" />,
                title: 'Маршрутный лист',
                description: 'Индивидуальные путевые листы для каждого пациента с QR-кодами',
              },
              {
                icon: <CheckCircle className="h-8 w-8" />,
                title: 'Врачебная комиссия',
                description: 'Цифровизация процесса осмотра с автоматическим сбором заключений',
              },
              {
                icon: <Shield className="h-8 w-8" />,
                title: 'Экспертиза',
                description: 'Автоматическое обобщение результатов и вынесение вердикта',
              },
              {
                icon: <FileText className="h-8 w-8" />,
                title: 'Итоговые документы',
                description: 'Автоматическая генерация заключительных актов и планов оздоровления',
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800"
              >
                <div className="mb-4 text-gray-900 dark:text-gray-100">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold mb-4">Готовы начать?</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
              Присоединяйтесь к платформе уже сегодня
            </p>
            <Link href="/auth">
              <Button size="lg">Начать работу</Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8 px-6">
        <div className="max-w-7xl mx-auto text-center text-gray-600 dark:text-gray-400">
          <p>© 2024 MedCRM. Все права защищены.</p>
        </div>
      </footer>
    </div>
  );
}

