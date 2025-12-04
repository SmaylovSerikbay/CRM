'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { StatCard } from '@/components/dashboard/StatCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Card } from '@/components/ui/Card';
import { 
  Users, 
  Calendar, 
  CheckCircle, 
  FileText,
  Clock
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { workflowStoreAPI } from '@/lib/store/workflow-store-api';
import { userStore } from '@/lib/store/user-store';

export default function ClinicDashboard() {
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayVisits: 0,
    completedExams: 0,
    pendingExams: 0,
  });
  const [dailyVisits, setDailyVisits] = useState<any[]>([]);
  const [examStatus, setExamStatus] = useState<any[]>([]);
  const [healthGroups, setHealthGroups] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        const userId = userStore.getCurrentUser()?.id;
        if (!userId) return;

        // Загружаем маршрутные листы
        const routeSheets = await workflowStoreAPI.getRouteSheets();
        
        // Загружаем экспертизы
        const expertises = await workflowStoreAPI.getExpertises();
        
        // Подсчитываем статистику
        const today = new Date().toISOString().split('T')[0];
        const todaySheets = routeSheets.filter((rs: any) => rs.visitDate === today);
        
        const completed = routeSheets.filter((rs: any) => 
          rs.services?.every((s: any) => s.status === 'completed')
        ).length;
        
        const pending = routeSheets.filter((rs: any) => 
          rs.services?.some((s: any) => s.status === 'pending')
        ).length;

        setStats({
          totalPatients: routeSheets.length,
          todayVisits: todaySheets.length,
          completedExams: completed,
          pendingExams: pending,
        });

        // Статус осмотров
        setExamStatus([
          { name: 'Завершено', value: completed, color: '#10b981' },
          { name: 'В процессе', value: pending, color: '#f59e0b' },
          { name: 'Не начато', value: Math.max(0, routeSheets.length - completed - pending), color: '#ef4444' },
        ]);

        // Распределение по группам здоровья
        const groups: Record<string, number> = {};
        expertises.forEach((exp: any) => {
          const group = exp.healthGroup || 'Не определена';
          groups[group] = (groups[group] || 0) + 1;
        });
        
        const healthGroupsData = Object.entries(groups).map(([name, value]) => ({
          name,
          value,
          color: name === '1' ? '#10b981' : name === '2' ? '#3b82f6' : name === '3' ? '#f59e0b' : name === '4' ? '#ef4444' : '#6b7280',
        }));
        setHealthGroups(healthGroupsData);

        // Визиты по дням (последние 7 дней)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toISOString().split('T')[0];
        });

        const visitsByDay = last7Days.map(date => {
          const daySheets = routeSheets.filter((rs: any) => rs.visitDate === date);
          const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
          const dayName = dayNames[new Date(date).getDay()];
          return {
            date: dayName,
            visits: daySheets.length,
          };
        });
        setDailyVisits(visitsByDay);

        // Последняя активность (последние 5 маршрутных листов)
        const recent = routeSheets
          .slice(-5)
          .reverse()
          .map((rs: any) => {
            const allCompleted = rs.services?.every((s: any) => s.status === 'completed');
            const someCompleted = rs.services?.some((s: any) => s.status === 'completed');
            let status = 'Ожидает';
            if (allCompleted) status = 'Завершен';
            else if (someCompleted) status = 'В процессе';

            const visitDate = rs.visitDate ? new Date(rs.visitDate) : new Date();
            return {
              patient: rs.patientName,
              status,
              time: visitDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            };
          });
        setRecentActivity(recent);

      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);
  return (
    <div>
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">Панель клиники</h1>
            <p className="text-gray-600 dark:text-gray-400">Добро пожаловать обратно</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <StatCard
              title="Всего пациентов"
              value={stats.totalPatients}
              change={isLoading ? 'Загрузка...' : `${stats.totalPatients} маршрутных листов`}
              trend="neutral"
              icon={Users}
              iconColor="text-blue-600 dark:text-blue-400"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <StatCard
              title="Визиты сегодня"
              value={stats.todayVisits}
              change={isLoading ? 'Загрузка...' : 'Запланировано на сегодня'}
              trend="neutral"
              icon={Calendar}
              iconColor="text-green-600 dark:text-green-400"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <StatCard
              title="Завершено осмотров"
              value={stats.completedExams}
              change={isLoading ? 'Загрузка...' : stats.totalPatients > 0 ? `${Math.round((stats.completedExams / stats.totalPatients) * 100)}% выполнено` : 'Нет данных'}
              trend="neutral"
              icon={CheckCircle}
              iconColor="text-purple-600 dark:text-purple-400"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <StatCard
              title="В процессе"
              value={stats.pendingExams}
              change={isLoading ? 'Загрузка...' : 'Требуют внимания'}
              trend="neutral"
              icon={Clock}
              iconColor="text-orange-600 dark:text-orange-400"
            />
          </motion.div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <ChartCard title="Визиты по дням недели">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyVisits}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="visits" fill="#000" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <ChartCard title="Статус осмотров">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={examStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {examStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </motion.div>
        </div>

        {/* Health Groups Chart */}
        {healthGroups.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mb-8"
          >
            <ChartCard title="Распределение по группам здоровья">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={healthGroups}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {healthGroups.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </motion.div>
        )}

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <Card>
            <h3 className="text-lg font-semibold mb-4">Последняя активность</h3>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto"></div>
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium">{activity.patient}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      activity.status === 'Завершен'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : activity.status === 'В процессе'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {activity.status}
                  </span>
                </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>Нет данных об активности</p>
              </div>
            )}
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

