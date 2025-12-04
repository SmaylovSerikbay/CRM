'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
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
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  
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
      
      console.log(`[PDF] Generating PDF for plan ${plan.id}`);
      
      // Вызываем API для генерации PDF
      const response = await fetch(`${API_URL}/api/calendar-plans/${plan.id}/export_pdf/`, {
        method: 'GET',
        credentials: 'include',
      });
      
      console.log(`[PDF] Response status: ${response.status}`);
      
      if (!response.ok) {
        let errorMessage = 'Ошибка генерации PDF';
        try {
          const errorData = await response.json();
          console.error('[PDF] Error response:', errorData);
          errorMessage = errorData.error || errorData.detail || errorMessage;
          if (errorData.details) {
            console.error('[PDF] Error details:', errorData.details);
          }
        } catch (e) {
          console.error('[PDF] Failed to parse error response:', e);
        }
        throw new Error(errorMessage);
      }
      
      // Получаем blob
      const blob = await response.blob();
      console.log(`[PDF] Blob size: ${blob.size} bytes`);
      
      if (blob.size === 0) {
        throw new Error('Получен пустой PDF файл');
      }
      
      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = `calendar_plan_${plan.department.replace(/[^a-zA-Z0-9а-яА-Я]/g, '_')}_${plan.startDate}.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      console.log(`[PDF] PDF downloaded: ${filename}`);
      showToast('PDF успешно сгенерирован и скачан', 'success');
    } catch (error: any) {
      console.error('[PDF] Error generating PDF:', error);
      showToast(error.message || 'Ошибка генерации PDF', 'error');
    }
  };

  const getEmployeeCount = (plan: CalendarPlan) => {
    return plan.employeeIds.length;
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
      sent_to_ses: {
        label: 'Отправлен в СЭС',
        icon: Download,
        colors: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
      },
    };
    return configs[status] || configs.draft;
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

        {/* Модальное окно создания календарного плана */}
        <Modal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setCurrentStep(1);
            setSelectedContractId('');
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
          title="Создать календарный план"
          size="xl"
        >
          <div className="mb-4">
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
        </Modal>

        {/* Plans List */}
        <div>
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
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
              {/* Таблица */}
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Объект/Участок
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Период
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Сотрудников
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Договор
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Статус
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
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
                              expandedPlan === plan.id ? 'bg-gray-50 dark:bg-gray-800/30' : ''
                            }`}
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {plan.department}
                                </span>
                              </div>
                              {plan.departmentsInfo && plan.departmentsInfo.length > 1 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                                  {plan.departmentsInfo.length} участков
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm text-gray-900 dark:text-white">
                                {new Date(plan.startDate).toLocaleDateString('ru-RU')} - {new Date(plan.endDate).toLocaleDateString('ru-RU')}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-purple-500" />
                                <span className="text-sm text-gray-900 dark:text-white">
                                  {getEmployeeCount(plan)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm text-gray-900 dark:text-white">
                                {plan.contractNumber ? `№${plan.contractNumber}` : '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${statusConfig.colors}`}>
                                <StatusIcon className="h-3.5 w-3.5" />
                                <span>{statusConfig.label}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                {(plan.status === 'draft' || plan.status === 'pending_clinic') && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprove(plan.id)}
                                  >
                                    Согласовать
                                  </Button>
                                )}
                                {plan.status === 'draft' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEdit(plan)}
                                    >
                                      <Edit className="h-4 w-4 mr-1" />
                                      Редактировать
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDelete(plan.id)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                      <Trash2 className="h-4 w-4 mr-1" />
                                      Удалить
                                    </Button>
                                  </>
                                )}
                                {plan.status === 'approved' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleSendToSES(plan.id)}
                                  >
                                    Отправить в СЭС
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
                            <tr>
                              <td colSpan={6} className="px-4 py-3 bg-gray-50 dark:bg-gray-800/30">
                                <AnimatePresence>
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-3"
                                  >
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                    Детали по участкам:
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {plan.departmentsInfo.map((deptInfo: any, idx: number) => (
                                      <Card key={idx} className="p-3">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                          {deptInfo.department}
                                        </p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                          {new Date(deptInfo.startDate).toLocaleDateString('ru-RU')} - {new Date(deptInfo.endDate).toLocaleDateString('ru-RU')}
                                        </p>
                                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                          <Users className="h-3 w-3" />
                                          <span>{deptInfo.employeeIds?.length || 0} сотрудников</span>
                                        </div>
                                      </Card>
                                    ))}
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
          )}
        </div>
      </main>
    </div>
  );
}
