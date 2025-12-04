'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Calendar, Download, CheckCircle, Clock, Users, AlertCircle, UserCheck, Edit, Trash2 } from 'lucide-react';
import { workflowStoreAPI, CalendarPlan, ContingentEmployee } from '@/lib/store/workflow-store-api';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/Toast';

export default function CalendarPlanPage() {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<CalendarPlan[]>([]);
  const [contingent, setContingent] = useState<ContingentEmployee[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // Текущий шаг формы
  const [formData, setFormData] = useState({
    selectedDepartments: [] as string[],
    useCommonDates: true, // Использовать одинаковые даты для всех
    commonStartDate: '',
    commonEndDate: '',
    departmentDates: {} as Record<string, { startDate: string; endDate: string }>, // Индивидуальные даты для каждого объекта/участка
    harmfulFactors: [] as string[],
    selectedDoctors: [] as string[],
  });
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [harmfulFactorsList, setHarmfulFactorsList] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Загружаем договоры
        const contractsData = await workflowStoreAPI.getContracts();
        // Включаем как утвержденные, так и исполненные договоры
        const approvedContracts = contractsData.filter((c: any) => c.status === 'approved' || c.status === 'executed');
        setContracts(approvedContracts);
        
        // Загружаем контингент (доступен для всех клиник после загрузки работодателем)
        const contingentData = await workflowStoreAPI.getContingent();
        setContingent(contingentData);
        
        // Получаем уникальные объекты/участки
        const departments = [...new Set(contingentData.map(emp => emp.department))];
        setAvailableDepartments(departments);
        
        // Загружаем календарные планы клиники
        const calendarPlans = await workflowStoreAPI.getCalendarPlans();
        setPlans(calendarPlans);
        
        // Загружаем список вредных факторов
        const factors = await apiClient.getHarmfulFactorsList();
        setHarmfulFactorsList(factors);
        
        // Загружаем список врачей клиники
        const doctorsList = await workflowStoreAPI.getDoctors();
        setDoctors(doctorsList);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Фильтруем контингент по выбранному договору
  const getFilteredContingent = (): ContingentEmployee[] => {
    if (!selectedContractId) return contingent;
    // В будущем можно добавить фильтрацию по contract_id в API
    return contingent;
  };

  const getContingentByDepartment = (department: string): ContingentEmployee[] => {
    const filtered = getFilteredContingent();
    return filtered.filter(emp => emp.department === department);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedContractId) {
      showToast('Пожалуйста, выберите договор перед созданием календарного плана', 'warning');
      return;
    }
    
    if (formData.selectedDepartments.length === 0) {
      showToast('Пожалуйста, выберите хотя бы один объект или участок', 'warning');
      return;
    }
    
    if (formData.useCommonDates && (!formData.commonStartDate || !formData.commonEndDate)) {
      showToast('Пожалуйста, укажите даты начала и окончания', 'warning');
      return;
    }
    
    try {
      // Собираем информацию о всех участках
      const departmentsInfo: Array<{department: string; startDate: string; endDate: string; employeeIds: string[]}> = [];
      const allEmployeeIds: string[] = [];
      let minStartDate: string | null = null;
      let maxEndDate: string | null = null;
      
      for (const department of formData.selectedDepartments) {
        const departmentEmployees = getContingentByDepartment(department);
        const employeeIds = departmentEmployees.map(emp => emp.id);
        
        if (employeeIds.length === 0) continue;
        
        let startDate: string;
        let endDate: string;
        
        if (formData.useCommonDates) {
          startDate = formData.commonStartDate;
          endDate = formData.commonEndDate;
        } else {
          const dates = formData.departmentDates[department];
          if (!dates || !dates.startDate || !dates.endDate) {
            showToast(`Пожалуйста, укажите даты для объекта/участка: ${department}`, 'warning');
            return;
          }
          startDate = dates.startDate;
          endDate = dates.endDate;
        }
        
        // Добавляем сотрудников в общий список
        allEmployeeIds.push(...employeeIds);
        
        // Отслеживаем минимальную дату начала и максимальную дату окончания
        if (!minStartDate || startDate < minStartDate) {
          minStartDate = startDate;
        }
        if (!maxEndDate || endDate > maxEndDate) {
          maxEndDate = endDate;
        }
        
        departmentsInfo.push({
          department,
          startDate,
          endDate,
          employeeIds,
        });
      }
      
      if (departmentsInfo.length === 0) {
        showToast('Не найдено сотрудников для выбранных участков', 'warning');
        return;
      }
      
      // Создаем один общий план для всех участков
      const mainDepartment = formData.selectedDepartments[0]; // Основной участок для обратной совместимости
      const planData = {
        department: formData.selectedDepartments.length === 1 
          ? mainDepartment 
          : `${formData.selectedDepartments.length} участков`,
        startDate: minStartDate!,
        endDate: maxEndDate!,
        employeeIds: [...new Set(allEmployeeIds)], // Убираем дубликаты
        departmentsInfo: departmentsInfo,
        harmfulFactors: formData.harmfulFactors,
        selectedDoctors: formData.selectedDoctors,
        contractId: selectedContractId,
      };
      
      await workflowStoreAPI.addCalendarPlan(planData, planData.employeeIds);

      // Обновляем список планов
      const updatedPlans = await workflowStoreAPI.getCalendarPlans();
      setPlans(updatedPlans);
      
      setFormData({ 
        selectedDepartments: [], 
        useCommonDates: true,
        commonStartDate: '', 
        commonEndDate: '', 
        departmentDates: {},
        harmfulFactors: [], 
        selectedDoctors: [] 
      });
      setCurrentStep(1);
      setShowForm(false);
      showToast(`Успешно создан календарный план для ${departmentsInfo.length} ${departmentsInfo.length === 1 ? 'участка' : 'участков'}`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка создания плана', 'error');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      // Клиника жмет "Согласовано" и отправляет план на утверждение работодателю
      await workflowStoreAPI.updateCalendarPlanStatus(id, 'pending_employer');
      const updatedPlans = await workflowStoreAPI.getCalendarPlans();
      setPlans(updatedPlans);
      showToast('План отправлен на утверждение работодателю', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка утверждения плана', 'error');
    }
  };

  const handleSendToSES = async (id: string) => {
    try {
      await workflowStoreAPI.updateCalendarPlanStatus(id, 'sent_to_ses');
      const updatedPlans = await workflowStoreAPI.getCalendarPlans();
      setPlans(updatedPlans);
      showToast('План успешно отправлен в СЭС', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка отправки в СЭС', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот календарный план?')) {
      return;
    }
    try {
      await workflowStoreAPI.deleteCalendarPlan(id);
      const updatedPlans = await workflowStoreAPI.getCalendarPlans();
      setPlans(updatedPlans);
      showToast('Календарный план успешно удален', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка удаления плана', 'error');
    }
  };

  const handleEdit = (plan: CalendarPlan) => {
    // Заполняем форму данными плана для редактирования
    setSelectedContractId(plan.contractId || '');
    // TODO: Заполнить форму данными плана
    setShowForm(true);
    setCurrentStep(1);
    showToast('Редактирование плана будет доступно в следующей версии', 'info');
  };

  const handleGeneratePDF = async (plan: CalendarPlan) => {
    try {
      showToast('Генерация PDF...', 'info');
      
      // Получаем API URL
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // Вызываем API для генерации PDF
      const response = await fetch(`${API_URL}/api/calendar-plans/${plan.id}/export_pdf/`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Ошибка генерации PDF' }));
        throw new Error(errorData.error || 'Ошибка генерации PDF');
      }
      
      // Получаем blob
      const blob = await response.blob();
      
      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `calendar_plan_${plan.department.replace(/[^a-zA-Z0-9]/g, '_')}_${plan.startDate}.pdf`);
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

  // Пагинация
  const totalPages = Math.ceil(plans.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPlans = plans.slice(startIndex, endIndex);

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
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold">Календарный план</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Планирование осмотров по потокам
              </p>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Планов: {plans.length}
              </div>
              <Button onClick={() => {
                setShowForm(!showForm);
                if (!showForm) {
                  setCurrentStep(1);
                }
              }} disabled={availableDepartments.length === 0}>
                <Calendar className="h-4 w-4 mr-2" />
                Создать план
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-4">
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

        {/* Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Создать календарный план</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Заполните форму пошагово для создания календарного плана медосмотров
                </p>
              </div>

              {/* Индикатор шагов */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex items-center ${currentStep >= 1 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 1 ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}`}>
                      {currentStep > 1 ? '✓' : '1'}
                    </div>
                    <span className="ml-2 text-sm font-medium">Договор</span>
                  </div>
                  <div className={`flex-1 h-0.5 mx-2 ${currentStep >= 2 ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                  <div className={`flex items-center ${currentStep >= 2 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 2 ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}`}>
                      {currentStep > 2 ? '✓' : '2'}
                    </div>
                    <span className="ml-2 text-sm font-medium">Объекты</span>
                  </div>
                  <div className={`flex-1 h-0.5 mx-2 ${currentStep >= 3 ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                  <div className={`flex items-center ${currentStep >= 3 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 3 ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}`}>
                      {currentStep > 3 ? '✓' : '3'}
                    </div>
                    <span className="ml-2 text-sm font-medium">Даты</span>
                  </div>
                  <div className={`flex-1 h-0.5 mx-2 ${currentStep >= 4 ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                  <div className={`flex items-center ${currentStep >= 4 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 4 ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}`}>
                      4
                    </div>
                    <span className="ml-2 text-sm font-medium">Дополнительно</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Шаг 1: Выбор договора */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Шаг 1: Выберите договор</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Выберите договор, по которому будет создан календарный план
                      </p>
                    </div>
                    
                    {contracts.length > 0 ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Договор *
                        </label>
                        <select
                          value={selectedContractId}
                          onChange={(e) => setSelectedContractId(e.target.value)}
                          required
                          className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                        >
                          <option value="">-- Выберите договор --</option>
                          {contracts.map((contract: any) => (
                            <option key={contract.id} value={contract.id}>
                              Договор №{contract.contract_number} от {new Date(contract.contract_date).toLocaleDateString('ru-RU')} - {contract.employer_name || `БИН: ${contract.employer_bin}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="text-yellow-700 dark:text-yellow-300">
                          У вас нет подтвержденных договоров. Сначала необходимо создать и подтвердить договор с работодателем.
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowForm(false);
                          setCurrentStep(1);
                        }}
                      >
                        Отмена
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          if (selectedContractId) {
                            setCurrentStep(2);
                          } else {
                            showToast('Пожалуйста, выберите договор', 'warning');
                          }
                        }}
                        disabled={!selectedContractId}
                      >
                        Далее →
                      </Button>
                    </div>
                  </div>
                )}

                {/* Шаг 2: Выбор объектов/участков */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Шаг 2: Выберите объекты или участки</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Выберите один или несколько объектов/участков для создания календарного плана. Для каждого объекта/участка будет создан отдельный план.
                      </p>
                    </div>

                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-lg p-4">
                        {availableDepartments.map(dept => {
                          const count = getContingentByDepartment(dept).length;
                          const isSelected = formData.selectedDepartments.includes(dept);
                          return (
                            <label 
                              key={dept} 
                              className={`flex items-start space-x-3 cursor-pointer p-3 rounded-lg border-2 transition-all ${
                                isSelected 
                                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      selectedDepartments: [...formData.selectedDepartments, dept],
                                      departmentDates: {
                                        ...formData.departmentDates,
                                        [dept]: formData.departmentDates[dept] || { startDate: '', endDate: '' }
                                      }
                                    });
                                  } else {
                                    const newDates = { ...formData.departmentDates };
                                    delete newDates[dept];
                                    setFormData({
                                      ...formData,
                                      selectedDepartments: formData.selectedDepartments.filter(d => d !== dept),
                                      departmentDates: newDates
                                    });
                                  }
                                }}
                                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block">
                                  {dept}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {count} {count === 1 ? 'сотрудник' : count < 5 ? 'сотрудника' : 'сотрудников'}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      {formData.selectedDepartments.length === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 text-center">
                          Выберите хотя бы один объект или участок
                        </p>
                      )}
                      {formData.selectedDepartments.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            ✓ Выбрано: {formData.selectedDepartments.length} {formData.selectedDepartments.length === 1 ? 'объект/участок' : 'объектов/участков'}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep(1)}
                      >
                        ← Назад
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          if (formData.selectedDepartments.length > 0) {
                            setCurrentStep(3);
                          } else {
                            showToast('Пожалуйста, выберите хотя бы один объект или участок', 'warning');
                          }
                        }}
                        disabled={formData.selectedDepartments.length === 0}
                      >
                        Далее →
                      </Button>
                    </div>
                  </div>
                )}

                {/* Шаг 3: Выбор дат */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Шаг 3: Укажите даты проведения осмотров</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Выберите период проведения медосмотров. Можно указать одинаковые даты для всех выбранных объектов/участков или индивидуальные даты для каждого.
                      </p>
                    </div>

                    {/* Режим дат */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Режим указания дат:
                      </label>
                      <div className="grid md:grid-cols-2 gap-3">
                        <label 
                          className={`flex items-center space-x-3 cursor-pointer p-4 rounded-lg border-2 transition-all ${
                            formData.useCommonDates 
                              ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <input
                            type="radio"
                            checked={formData.useCommonDates}
                            onChange={() => setFormData({ ...formData, useCommonDates: true })}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block">
                              Одинаковые даты для всех
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Все объекты/участки в один период
                            </span>
                          </div>
                        </label>
                        <label 
                          className={`flex items-center space-x-3 cursor-pointer p-4 rounded-lg border-2 transition-all ${
                            !formData.useCommonDates 
                              ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <input
                            type="radio"
                            checked={!formData.useCommonDates}
                            onChange={() => setFormData({ ...formData, useCommonDates: false })}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 block">
                              Индивидуальные даты
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Каждый объект/участок в свой период
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Поля дат */}
                    {formData.useCommonDates ? (
                      <div className="grid md:grid-cols-2 gap-4">
                        <Input
                          type="date"
                          label="Дата начала (для всех объектов/участков)"
                          value={formData.commonStartDate}
                          onChange={(e) => setFormData({ ...formData, commonStartDate: e.target.value })}
                          required
                        />
                        <Input
                          type="date"
                          label="Дата окончания (для всех объектов/участков)"
                          value={formData.commonEndDate}
                          onChange={(e) => setFormData({ ...formData, commonEndDate: e.target.value })}
                          required
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Укажите даты для каждого выбранного объекта/участка:
                        </p>
                        {formData.selectedDepartments.map(dept => (
                          <Card key={dept} className="p-4">
                            <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              {dept}
                            </h4>
                            <div className="grid md:grid-cols-2 gap-4">
                              <Input
                                type="date"
                                label="Дата начала"
                                value={formData.departmentDates[dept]?.startDate || ''}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  departmentDates: {
                                    ...formData.departmentDates,
                                    [dept]: {
                                      ...formData.departmentDates[dept] || { startDate: '', endDate: '' },
                                      startDate: e.target.value
                                    }
                                  }
                                })}
                                required
                              />
                              <Input
                                type="date"
                                label="Дата окончания"
                                value={formData.departmentDates[dept]?.endDate || ''}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  departmentDates: {
                                    ...formData.departmentDates,
                                    [dept]: {
                                      ...formData.departmentDates[dept] || { startDate: '', endDate: '' },
                                      endDate: e.target.value
                                    }
                                  }
                                })}
                                required
                              />
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep(2)}
                      >
                        ← Назад
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          let isValid = true;
                          if (formData.useCommonDates) {
                            if (!formData.commonStartDate || !formData.commonEndDate) {
                              isValid = false;
                              showToast('Пожалуйста, укажите даты начала и окончания', 'warning');
                            }
                          } else {
                            for (const dept of formData.selectedDepartments) {
                              const dates = formData.departmentDates[dept];
                              if (!dates || !dates.startDate || !dates.endDate) {
                                isValid = false;
                                showToast(`Пожалуйста, укажите даты для объекта/участка: ${dept}`, 'warning');
                                break;
                              }
                            }
                          }
                          if (isValid) {
                            setCurrentStep(4);
                          }
                        }}
                      >
                        Далее →
                      </Button>
                    </div>
                  </div>
                )}

                {/* Шаг 4: Дополнительные настройки */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Шаг 4: Дополнительные настройки</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Укажите вредные факторы и выберите врачей (необязательно)
                      </p>
                    </div>
                
                    {/* Вредные факторы */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Вредные факторы
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 font-normal">(необязательно)</span>
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Выберите вредные факторы для формирования приказа медкомиссии
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-lg p-3">
                        {harmfulFactorsList.map((factor) => (
                          <label key={factor} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={formData.harmfulFactors.includes(factor)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    harmfulFactors: [...formData.harmfulFactors, factor],
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    harmfulFactors: formData.harmfulFactors.filter(f => f !== factor),
                                  });
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{factor}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Выбор врачей */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Врачи клиники
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 font-normal">(необязательно)</span>
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        Выберите врачей, которые будут проводить осмотр
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-lg p-3">
                        {doctors.map((doctor) => (
                          <label key={doctor.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded">
                            <input
                              type="checkbox"
                              checked={formData.selectedDoctors.includes(doctor.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    selectedDoctors: [...formData.selectedDoctors, doctor.id],
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    selectedDoctors: formData.selectedDoctors.filter(id => id !== doctor.id),
                                  });
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {doctor.name} - {doctor.specialization} {doctor.cabinet ? `(каб. ${doctor.cabinet})` : ''}
                            </span>
                          </label>
                        ))}
                      </div>
                      {doctors.length === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          Врачи не добавлены. Добавьте врачей в разделе &quot;Врачи&quot;.
                        </p>
                      )}
                    </div>

                    {/* Сводка */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Сводка:
                      </h4>
                      <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        <p>• Договор: {contracts.find(c => c.id === selectedContractId)?.contract_number || 'не выбран'}</p>
                        <p>• Объектов/участков: {formData.selectedDepartments.length}</p>
                        <p>• Будет создан: 1 общий календарный план для всех участков</p>
                        {formData.useCommonDates ? (
                          <p>• Период: {formData.commonStartDate && formData.commonEndDate 
                            ? `${new Date(formData.commonStartDate).toLocaleDateString('ru-RU')} - ${new Date(formData.commonEndDate).toLocaleDateString('ru-RU')}`
                            : 'не указан'}</p>
                        ) : (
                          <p>• Периоды: индивидуальные для каждого объекта/участка</p>
                        )}
                        <p>• Вредных факторов: {formData.harmfulFactors.length}</p>
                        <p>• Врачей: {formData.selectedDoctors.length}</p>
                      </div>
                    </div>

                    <div className="flex justify-between gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCurrentStep(3)}
                      >
                        ← Назад
                      </Button>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowForm(false);
                            setCurrentStep(1);
                            setFormData({ 
                              selectedDepartments: [], 
                              useCommonDates: true,
                              commonStartDate: '', 
                              commonEndDate: '', 
                              departmentDates: {},
                              harmfulFactors: [], 
                              selectedDoctors: [] 
                            });
                          }}
                        >
                          Отмена
                        </Button>
                        <Button type="submit">
                          Создать календарный план
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </Card>
          </motion.div>
        )}

        {/* Plans List */}
        <div className="space-y-3">
          {plans.length === 0 && !showForm ? (
            <Card>
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Календарный план не создан</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Создайте календарный план для планирования осмотров по потокам
                </p>
                <Button onClick={() => setShowForm(true)} disabled={availableDepartments.length === 0}>
                  Создать план
                </Button>
              </div>
            </Card>
          ) : (
            <>
              {paginatedPlans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Основная информация */}
                  <div className="lg:col-span-2 space-y-3">
                    {/* Заголовок и статус */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center shadow-md flex-shrink-0">
                          <Calendar className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5 truncate">{plan.department}</h3>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {plan.status === 'draft' && (
                              <span className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg">
                                Черновик
                              </span>
                            )}
                            {plan.status === 'pending_clinic' && (
                              <span className="px-3 py-1.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                Ожидает утверждения клиникой
                              </span>
                            )}
                            {plan.status === 'pending_employer' && (
                              <span className="px-3 py-1.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                Ожидает утверждения работодателем
                              </span>
                            )}
                            {plan.status === 'approved' && (
                              <span className="px-3 py-1.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg flex items-center gap-1.5">
                                <CheckCircle className="h-3.5 w-3.5" />
                                Утвержден обеими сторонами
                              </span>
                            )}
                            {plan.status === 'sent_to_ses' && (
                              <span className="px-3 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg">
                                Отправлен в СЭС
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Информация о периодах и участках */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-2">
                      {plan.departmentsInfo && plan.departmentsInfo.length > 1 ? (
                        <>
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
                          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-gray-600 dark:text-gray-400">Период:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {new Date(plan.startDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {new Date(plan.endDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Дополнительная информация */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                      {plan.contractNumber && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Договор:</span>
                          <span className="text-gray-900 dark:text-white">№{plan.contractNumber}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">{getEmployeeCount(plan)}</span>
                        <span>сотрудников</span>
                      </div>
                    </div>
                  </div>

                  {/* Действия */}
                  <div className="lg:col-span-1">
                    <div className="flex flex-col gap-2 lg:sticky lg:top-20">
                      {plan.status === 'draft' && (
                        <>
                          <Button size="sm" onClick={() => handleApprove(plan.id)} className="w-full">
                            Согласовано (Клиника)
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEdit(plan)} className="w-full">
                            <Edit className="h-4 w-4 mr-2" />
                            Редактировать
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(plan.id)} className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Удалить
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleGeneratePDF(plan)} className="w-full">
                            <Download className="h-4 w-4 mr-2" />
                            Генерировать PDF
                          </Button>
                        </>
                      )}
                      {plan.status === 'pending_employer' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleGeneratePDF(plan)} className="w-full">
                            <Download className="h-4 w-4 mr-2" />
                            Просмотреть PDF
                          </Button>
                        </>
                      )}
                      {plan.status === 'approved' && (
                        <>
                          <Button size="sm" onClick={() => handleSendToSES(plan.id)} className="w-full">
                            Отправить в СЭС
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleGeneratePDF(plan)} className="w-full">
                            <Download className="h-4 w-4 mr-2" />
                            Скачать PDF
                          </Button>
                        </>
                      )}
                      {plan.status === 'sent_to_ses' && (
                        <Button size="sm" variant="outline" onClick={() => handleGeneratePDF(plan)} className="w-full">
                          <Download className="h-4 w-4 mr-2" />
                          Скачать PDF
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
              ))}
              
              {/* Пагинация */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Страница {currentPage} из {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">На странице:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900"
                      >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                      </select>
                    </div>
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
                            className={`px-3 py-1 text-sm rounded ${
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
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
