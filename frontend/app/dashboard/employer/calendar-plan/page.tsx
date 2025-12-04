'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Calendar, Download, CheckCircle, Clock, Users, AlertCircle } from 'lucide-react';
import { workflowStoreAPI } from '@/lib/store/workflow-store-api';
import { CalendarPlan } from '@/lib/store/workflow-store';
import { useToast } from '@/components/ui/Toast';

export default function EmployerCalendarPlanPage() {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<CalendarPlan[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Получаем доступные объекты/участки из загруженного контингента
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
      showToast('План успешно утвержден', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка утверждения плана', 'error');
    }
  };

  const handleGeneratePDF = (plan: CalendarPlan) => {
    // Симуляция генерации PDF
    showToast(`Генерация PDF календарного плана для ${plan.department}...`, 'info');
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
                  <Card className="hover:shadow-lg transition-shadow">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Основная информация */}
                      <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 dark:from-yellow-600 dark:to-yellow-700 flex items-center justify-center shadow-md flex-shrink-0">
                            <Calendar className="h-7 w-7 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{plan.department}</h3>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg">
                              <Clock className="h-3.5 w-3.5" />
                              Ожидает утверждения работодателем
                            </span>
                          </div>
                        </div>

                        {/* Информация о периодах и участках */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
                          {plan.departmentsInfo && plan.departmentsInfo.length > 1 ? (
                            <>
                              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <Calendar className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                <span>Общий период:</span>
                                <span className="text-gray-900 dark:text-white">
                                  {new Date(plan.startDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {new Date(plan.endDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </span>
                              </div>
                              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Участки ({plan.departmentsInfo.length}):</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {plan.departmentsInfo.map((deptInfo: any, idx: number) => (
                                    <div key={idx} className="bg-white dark:bg-gray-900 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{deptInfo.department}</p>
                                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                        {new Date(deptInfo.startDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {new Date(deptInfo.endDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                      </p>
                                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                        <Users className="h-3 w-3" />
                                        <span>{deptInfo.employeeIds?.length || 0} сотрудников</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                              <span className="text-gray-600 dark:text-gray-400">Период:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {new Date(plan.startDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {new Date(plan.endDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Дополнительная информация */}
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Users className="h-4 w-4" />
                          <span className="font-medium">{getEmployeeCount(plan)}</span>
                          <span>сотрудников</span>
                        </div>
                      </div>

                      {/* Действия */}
                      <div className="lg:col-span-1">
                        <div className="flex flex-col gap-2 lg:sticky lg:top-4">
                          <Button size="sm" onClick={() => handleApprove(plan.id)} className="w-full">
                            Согласовано (Работодатель)
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleGeneratePDF(plan)} className="w-full">
                            <Download className="h-4 w-4 mr-2" />
                            Просмотреть PDF
                          </Button>
                        </div>
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
                  <Card className="hover:shadow-lg transition-shadow">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Основная информация */}
                      <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 flex items-center justify-center shadow-md flex-shrink-0">
                            <Calendar className="h-7 w-7 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{plan.department}</h3>
                            <div className="flex flex-wrap items-center gap-2">
                              {plan.status === 'approved' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Утвержден обеими сторонами
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg">
                                  Отправлен в СЭС
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Информация о периодах и участках */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
                          {plan.departmentsInfo && plan.departmentsInfo.length > 1 ? (
                            <>
                              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span>Общий период:</span>
                                <span className="text-gray-900 dark:text-white">
                                  {new Date(plan.startDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {new Date(plan.endDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </span>
                              </div>
                              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Участки ({plan.departmentsInfo.length}):</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {plan.departmentsInfo.map((deptInfo: any, idx: number) => (
                                    <div key={idx} className="bg-white dark:bg-gray-900 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{deptInfo.department}</p>
                                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                        {new Date(deptInfo.startDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {new Date(deptInfo.endDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                      </p>
                                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                        <Users className="h-3 w-3" />
                                        <span>{deptInfo.employeeIds?.length || 0} сотрудников</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <span className="text-gray-600 dark:text-gray-400">Период:</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {new Date(plan.startDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {new Date(plan.endDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Дополнительная информация */}
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Users className="h-4 w-4" />
                          <span className="font-medium">{getEmployeeCount(plan)}</span>
                          <span>сотрудников</span>
                        </div>
                      </div>

                      {/* Действия */}
                      <div className="lg:col-span-1">
                        <div className="flex flex-col gap-2 lg:sticky lg:top-4">
                          <Button size="sm" variant="outline" onClick={() => handleGeneratePDF(plan)} className="w-full">
                            <Download className="h-4 w-4 mr-2" />
                            Скачать PDF
                          </Button>
                        </div>
                      </div>
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

