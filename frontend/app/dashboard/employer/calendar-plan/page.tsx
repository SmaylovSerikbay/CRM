'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  const handleGeneratePDF = async (plan: CalendarPlan) => {
    try {
      showToast('Генерация PDF...', 'info');
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      
      const response = await fetch(`${API_URL}/calendar-plans/${plan.id}/export_pdf/`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        let errorMessage = 'Ошибка генерации PDF';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.detail || errorMessage;
        } catch (e) {
          // ignore
        }
        throw new Error(errorMessage);
      }
      
      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('Получен пустой PDF файл');
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = `calendar_plan_${plan.department.replace(/[^a-zA-Z0-9а-яА-Я]/g, '_')}_${plan.startDate}.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showToast('PDF успешно сгенерирован и скачан', 'success');
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      showToast(error.message || 'Ошибка генерации PDF', 'error');
    }
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

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; icon: any; colors: string }> = {
      draft: {
        label: 'Черновик',
        icon: Clock,
        colors: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
      },
      pending_clinic: {
        label: 'Ожидает утверждения клиникой',
        icon: Clock,
        colors: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
      },
      pending_employer: {
        label: 'Ожидает утверждения работодателем',
        icon: Clock,
        colors: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
      },
      approved: {
        label: 'Утвержден',
        icon: CheckCircle,
        colors: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      },
    };
    return configs[status] || configs.draft;
  };

  // Фильтруем планы, которые ожидают утверждения работодателем
  const pendingPlans = plans.filter(p => p.status === 'pending_employer');
  const approvedPlans = plans.filter(p => p.status === 'approved');
  
  // Пагинация
  const allPlans = [...pendingPlans, ...approvedPlans];
  const totalPages = Math.ceil(allPlans.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPlans = allPlans.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Sticky Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 flex-shrink-0">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold">Календарный план</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Утверждение календарных планов, созданных клиникой
              </p>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Планов: {plans.length}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {availableDepartments.length === 0 && (
          <Card className="mb-8">
            <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Список контингента не загружен
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Сначала необходимо загрузить список контингента по договору
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Таблица планов */}
        {allPlans.length > 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
            {/* Таблица */}
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Объект/Участок
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Период
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase w-24">
                      Сотрудников
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase w-28">
                      Договор
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase w-40">
                      Статус
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {paginatedPlans.map((plan, index) => {
                    const statusConfig = getStatusConfig(plan.status);
                    const StatusIcon = statusConfig.icon;
                    
                    return (
                      <>
                        <motion.tr
                          key={plan.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                            expandedPlan === plan.id 
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400' 
                              : ''
                          }`}
                        >
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" />
                              <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[250px]">
                                {plan.department}
                              </span>
                            </div>
                            {plan.departmentsInfo && plan.departmentsInfo.length > 1 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                                {plan.departmentsInfo.length} участков
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-sm text-gray-900 dark:text-white">
                              {new Date(plan.startDate).toLocaleDateString('ru-RU')} - {new Date(plan.endDate).toLocaleDateString('ru-RU')}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-purple-500 flex-shrink-0" />
                              <span className="text-sm text-gray-900 dark:text-white">
                                {getEmployeeCount(plan)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-sm text-gray-900 dark:text-white">
                              {plan.contractNumber ? `№${plan.contractNumber}` : '—'}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${statusConfig.colors}`}>
                              <StatusIcon className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate max-w-[140px]">{statusConfig.label}</span>
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="flex items-center justify-end gap-2 flex-wrap">
                              {plan.status === 'pending_employer' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(plan.id)}
                                >
                                  Согласовать
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleGeneratePDF(plan)}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                PDF
                              </Button>
                              {(plan.departmentsInfo && plan.departmentsInfo.length > 1) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                                >
                                  {expandedPlan === plan.id ? 'Скрыть' : 'Подробнее'}
                                </Button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                        
                        {/* Развернутая информация о нескольких участках */}
                        {expandedPlan === plan.id && plan.departmentsInfo && plan.departmentsInfo.length > 1 && (
                          <tr className="bg-blue-50/30 dark:bg-blue-900/10">
                            <td colSpan={6} className="px-0 py-0">
                              <AnimatePresence>
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden"
                                >
                                  {/* Соединительная линия */}
                                  <div className="h-px bg-blue-300 dark:bg-blue-700 mx-4"></div>
                                  
                                  <div className="px-4 py-4 bg-blue-50/50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400">
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-center">
                                        <Calendar className="h-3.5 w-3.5 text-white" />
                                      </div>
                                      <span>Детали по участкам календарного плана &quot;{plan.department}&quot; ({plan.departmentsInfo.length})</span>
                                    </h4>
                                    
                                    {/* Подтаблица */}
                                    <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                      <table className="w-full text-sm">
                                        <thead>
                                          <tr className="bg-gray-100 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-700">
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                                              №
                                            </th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                                              Объект/Участок
                                            </th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                                              Период
                                            </th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                                              Сотрудников
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                          {plan.departmentsInfo.map((deptInfo: any, idx: number) => (
                                            <motion.tr
                                              key={idx}
                                              initial={{ opacity: 0, x: -10 }}
                                              animate={{ opacity: 1, x: 0 }}
                                              transition={{ delay: idx * 0.05 }}
                                              className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                            >
                                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-medium">
                                                {idx + 1}
                                              </td>
                                              <td className="px-4 py-3">
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                  {deptInfo.department}
                                                </span>
                                              </td>
                                              <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {new Date(deptInfo.startDate).toLocaleDateString('ru-RU')} - {new Date(deptInfo.endDate).toLocaleDateString('ru-RU')}
                                                  </span>
                                                </div>
                                              </td>
                                              <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                  <Users className="h-3.5 w-3.5 text-purple-500" />
                                                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                                    {deptInfo.employeeIds?.length || 0} {deptInfo.employeeIds?.length === 1 ? 'сотрудник' : deptInfo.employeeIds?.length < 5 ? 'сотрудника' : 'сотрудников'}
                                                  </span>
                                                </div>
                                              </td>
                                            </motion.tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </motion.div>
                              </AnimatePresence>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Страница {currentPage} из {totalPages}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">На странице:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                    >
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Назад
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1 text-sm rounded transition-colors ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Вперед
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
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

