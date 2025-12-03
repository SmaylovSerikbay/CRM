'use client';

import { motion } from 'framer-motion';
import { StatCard } from '@/components/dashboard/StatCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { Card } from '@/components/ui/Card';
import { 
  Users, 
  Calendar, 
  CheckCircle, 
  FileText,
  Clock,
  Building2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const employerStats = {
  totalEmployees: 1250,
  examined: 892,
  pending: 358,
  completedPercentage: 71,
  avgExamTime: '2.3ч',
};

const departmentStats = [
  { department: 'Цех №1', examined: 245, total: 300 },
  { department: 'Цех №2', examined: 189, total: 250 },
  { department: 'Цех №3', examined: 156, total: 200 },
  { department: 'Офис', examined: 302, total: 500 },
];

const examProgress = [
  { date: '01.02', completed: 45 },
  { date: '02.02', completed: 52 },
  { date: '03.02', completed: 38 },
  { date: '04.02', completed: 61 },
  { date: '05.02', completed: 43 },
  { date: '06.02', completed: 55 },
  { date: '07.02', completed: 48 },
];

const examResults = [
  { name: 'Годен', value: 750, color: '#10b981' },
  { name: 'Временные противопоказания', value: 120, color: '#f59e0b' },
  { name: 'Постоянные противопоказания', value: 22, color: '#ef4444' },
];

const upcomingExams = [
  { employee: 'Иванов И.И.', department: 'Цех №1', date: '08.02.2024', time: '10:00' },
  { employee: 'Петров П.П.', department: 'Цех №2', date: '08.02.2024', time: '10:30' },
  { employee: 'Сидоров С.С.', department: 'Цех №3', date: '08.02.2024', time: '11:00' },
  { employee: 'Козлов К.К.', department: 'Офис', date: '08.02.2024', time: '11:30' },
];

export default function EmployerDashboard() {
  return (
    <div>
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">Панель работодателя</h1>
            <p className="text-gray-600 dark:text-gray-400">Управление медицинскими осмотрами сотрудников</p>
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
              title="Всего сотрудников"
              value={employerStats.totalEmployees}
              change="+25 за месяц"
              trend="up"
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
              title="Прошли осмотр"
              value={employerStats.examined}
              change={`${employerStats.completedPercentage}% выполнено`}
              trend="up"
              icon={CheckCircle}
              iconColor="text-green-600 dark:text-green-400"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <StatCard
              title="Ожидают осмотра"
              value={employerStats.pending}
              change="29% осталось"
              trend="neutral"
              icon={Clock}
              iconColor="text-orange-600 dark:text-orange-400"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <StatCard
              title="Среднее время"
              value={employerStats.avgExamTime}
              change="на осмотр"
              trend="neutral"
              icon={FileText}
              iconColor="text-purple-600 dark:text-purple-400"
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
            <ChartCard title="Прогресс осмотров по дням">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={examProgress}>
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
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="#000" 
                    strokeWidth={2}
                    dot={{ fill: '#000', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <ChartCard title="Результаты осмотров">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={examResults}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {examResults.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </motion.div>
        </div>

        {/* Department Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-8"
        >
          <ChartCard title="Прогресс по цехам">
            <div className="space-y-4">
              {departmentStats.map((dept, index) => {
                const percentage = Math.round((dept.examined / dept.total) * 100);
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{dept.department}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {dept.examined} / {dept.total} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-black dark:bg-white h-3 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>
        </motion.div>

        {/* Upcoming Exams */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
        >
          <Card>
            <h3 className="text-lg font-semibold mb-4">Ближайшие осмотры</h3>
            <div className="space-y-3">
              {upcomingExams.map((exam, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium">{exam.employee}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {exam.department} • {exam.date} в {exam.time}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    Запланирован
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

