'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Calendar, Download, CheckCircle, Clock, Users, AlertCircle, X, FileText } from 'lucide-react';
import { workflowStoreAPI, ContingentEmployee } from '@/lib/store/workflow-store-api';
import { CalendarPlan } from '@/lib/store/workflow-store';
import { useToast } from '@/components/ui/Toast';

export default function EmployerCalendarPlanPage() {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<CalendarPlan[]>([]);
  const [contingent, setContingent] = useState<ContingentEmployee[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [selectedPlanEmployees, setSelectedPlanEmployees] = useState<ContingentEmployee[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Получаем доступные объекты/участки из загруженного контингента
        const contingentData = await workflowStoreAPI.getContingent();
        setContingent(contingentData);
        const departments = [...new Set(contingentData.map(emp => emp.department))];
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

  const handleShowEmployees = (plan: CalendarPlan) => {
    // Получаем сотрудников по их ID из плана
    const employees = contingent.filter(emp => plan.employeeIds.includes(emp.id));
    setSelectedPlanEmployees(employees);
    setShowEmployeeModal(true);
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
                        <button
                          onClick={() => handleShowEmployees(plan)}
                          className="flex items-center gap-2 text-sm hover:bg-yellow-50 dark:hover:bg-yellow-900/20 px-3 py-2 rounded-lg transition-colors group"
                        >
                          <Users className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                          <span className="font-medium text-yellow-600 dark:text-yellow-400">{getEmployeeCount(plan)}</span>
                          <span className="text-gray-600 dark:text-gray-400 group-hover:text-yellow-700 dark:group-hover:text-yellow-300">сотрудников</span>
                          <span className="text-yellow-600 dark:text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                        </button>
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
                                      <button
                                        onClick={() => handleShowEmployees(plan)}
                                        className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                                      >
                                        <Users className="h-3 w-3" />
                                        <span className="underline">{deptInfo.employeeIds?.length || 0} сотрудников</span>
                                      </button>
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
                        <button
                          onClick={() => handleShowEmployees(plan)}
                          className="flex items-center gap-2 text-sm hover:bg-green-50 dark:hover:bg-green-900/20 px-3 py-2 rounded-lg transition-colors group"
                        >
                          <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="font-medium text-green-600 dark:text-green-400">{getEmployeeCount(plan)}</span>
                          <span className="text-gray-600 dark:text-gray-400 group-hover:text-green-700 dark:group-hover:text-green-300">сотрудников</span>
                          <span className="text-green-600 dark:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                        </button>
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

      {/* Модальное окно со списком сотрудников */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Заголовок */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Список сотрудников
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Всего сотрудников: {selectedPlanEmployees.length}
                </p>
              </div>
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>

            {/* Содержимое */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {selectedPlanEmployees.map((employee, index) => (
                  <motion.div
                    key={employee.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Основная информация о сотруднике */}
                        <div className="lg:col-span-2 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                              {employee.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                {employee.name}
                              </h3>
                              <div className="space-y-1 text-sm">
                                <p className="text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">Должность:</span> {employee.position}
                                </p>
                                <p className="text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">Участок:</span> {employee.department}
                                </p>
                                <p className="text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">ИИН:</span> {employee.iin}
                                </p>
                                {employee.phone && (
                                  <p className="text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">Телефон:</span> {employee.phone}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Информация о стаже */}
                          {(employee.totalExperienceYears || employee.positionExperienceYears) && (
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                                Стаж работы
                              </p>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                {employee.totalExperienceYears && (
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Общий стаж:</span>
                                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                      {employee.totalExperienceYears} {employee.totalExperienceYears === 1 ? 'год' : employee.totalExperienceYears < 5 ? 'года' : 'лет'}
                                    </span>
                                  </div>
                                )}
                                {employee.positionExperienceYears && (
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">На должности:</span>
                                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                                      {employee.positionExperienceYears} {employee.positionExperienceYears === 1 ? 'год' : employee.positionExperienceYears < 5 ? 'года' : 'лет'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Информация об анализах и осмотрах */}
                        <div className="lg:col-span-1 space-y-3">
                          {/* Вредные факторы */}
                          {employee.harmfulFactors && employee.harmfulFactors.length > 0 && (
                            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                <p className="text-xs font-semibold text-orange-800 dark:text-orange-200 uppercase tracking-wide">
                                  Вредные факторы
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {employee.harmfulFactors.map((factor, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded"
                                  >
                                    {factor}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Даты осмотров */}
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 uppercase tracking-wide">
                                График осмотров
                              </p>
                            </div>
                            <div className="space-y-2 text-sm">
                              {employee.lastExaminationDate && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Последний осмотр:</span>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {new Date(employee.lastExaminationDate).toLocaleDateString('ru-RU', {
                                      day: '2-digit',
                                      month: 'long',
                                      year: 'numeric'
                                    })}
                                  </p>
                                </div>
                              )}
                              {employee.nextExaminationDate && (
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Следующий осмотр:</span>
                                  <p className="font-medium text-blue-700 dark:text-blue-300">
                                    {new Date(employee.nextExaminationDate).toLocaleDateString('ru-RU', {
                                      day: '2-digit',
                                      month: 'long',
                                      year: 'numeric'
                                    })}
                                  </p>
                                </div>
                              )}
                              {!employee.lastExaminationDate && !employee.nextExaminationDate && (
                                <p className="text-gray-500 dark:text-gray-400 text-xs italic">
                                  Даты осмотров не указаны
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Требуемые анализы */}
                          {employee.requiresExamination && (
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <p className="text-xs font-semibold text-green-800 dark:text-green-200 uppercase tracking-wide">
                                  Требуемые анализы
                                </p>
                              </div>
                              <div className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
                                <p>• Общий анализ крови</p>
                                <p>• Общий анализ мочи</p>
                                <p>• Флюорография</p>
                                <p>• ЭКГ</p>
                                {employee.harmfulFactors && employee.harmfulFactors.length > 0 && (
                                  <p className="text-orange-600 dark:text-orange-400 font-medium mt-2">
                                    + Дополнительные анализы по вредным факторам
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Примечания */}
                          {employee.notes && (
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">
                                Примечания
                              </p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {employee.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}

                {selectedPlanEmployees.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      Нет сотрудников в этом плане
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Футер */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
              <Button variant="outline" onClick={() => setShowEmployeeModal(false)}>
                Закрыть
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

