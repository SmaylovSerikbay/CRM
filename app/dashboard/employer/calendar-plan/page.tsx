'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Calendar, Download, CheckCircle, Clock, Users, AlertCircle } from 'lucide-react';
import { workflowStoreAPI } from '@/lib/store/workflow-store-api';
import { CalendarPlan } from '@/lib/store/workflow-store';

export default function EmployerCalendarPlanPage() {
  const [plans, setPlans] = useState<CalendarPlan[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Получаем доступные отделы из загруженного контингента
        const contingent = await workflowStoreAPI.getContingent();
        const departments = [...new Set(contingent.map(emp => emp.department))];
        setAvailableDepartments(departments);
        
        // Загружаем календарные планы
        const calendarPlans = await workflowStoreAPI.getCalendarPlans();
        setPlans(calendarPlans);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      // Работодатель жмет "Согласовано" - план утвержден обеими сторонами
      await workflowStoreAPI.updateCalendarPlanStatus(id, 'approved');
      const updatedPlans = await workflowStoreAPI.getCalendarPlans();
      setPlans(updatedPlans);
    } catch (error: any) {
      alert(error.message || 'Ошибка утверждения плана');
    }
  };

  const handleGeneratePDF = (plan: CalendarPlan) => {
    // Симуляция генерации PDF
    alert(`Генерация PDF календарного плана для ${plan.department}...`);
  };

  const getEmployeeCount = (plan: CalendarPlan) => {
    return plan.employeeIds.length;
  };

  // Фильтруем планы, которые ожидают утверждения работодателем
  const pendingPlans = plans.filter(p => p.status === 'pending_employer');
  const approvedPlans = plans.filter(p => p.status === 'approved' || p.status === 'sent_to_ses');

  return (
    <div>
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold">Календарный план</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Утверждение календарных планов, созданных клиникой. После утверждения план отправляется в СЭС.
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {availableDepartments.length === 0 && (
          <Card className="mb-8">
            <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Список контингента не загружен
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Сначала загрузите список контингента
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Pending Plans */}
        {pendingPlans.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Ожидают утверждения</h2>
            <div className="space-y-4">
              {pendingPlans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{plan.department}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(plan.startDate).toLocaleDateString('ru-RU')} - {new Date(plan.endDate).toLocaleDateString('ru-RU')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Users className="h-4 w-4" />
                            {getEmployeeCount(plan)} сотрудников
                          </div>
                        </div>
                        <span className="px-3 py-1 text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full flex items-center gap-2 w-fit">
                          <Clock className="h-4 w-4" />
                          Ожидает утверждения работодателем
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" onClick={() => handleApprove(plan.id)}>
                          Согласовано (Работодатель)
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleGeneratePDF(plan)}>
                          <Download className="h-4 w-4 mr-2" />
                          Просмотреть PDF
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Approved Plans */}
        {approvedPlans.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Утвержденные планы</h2>
            <div className="space-y-4">
              {approvedPlans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                            <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{plan.department}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(plan.startDate).toLocaleDateString('ru-RU')} - {new Date(plan.endDate).toLocaleDateString('ru-RU')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <Users className="h-4 w-4" />
                            {getEmployeeCount(plan)} сотрудников
                          </div>
                        </div>
                        {plan.status === 'approved' ? (
                          <span className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full flex items-center gap-2 w-fit">
                            <CheckCircle className="h-4 w-4" />
                            Утвержден обеими сторонами
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full w-fit">
                            Отправлен в СЭС
                          </span>
                        )}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleGeneratePDF(plan)}>
                        <Download className="h-4 w-4 mr-2" />
                        Скачать PDF
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {plans.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Нет календарных планов</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Календарные планы появятся здесь после того, как клиника их создаст и отправит на утверждение
              </p>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

