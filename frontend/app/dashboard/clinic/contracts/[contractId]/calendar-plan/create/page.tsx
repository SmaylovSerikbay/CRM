'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, Calendar, Plus, X, Search } from 'lucide-react';
import { workflowStoreAPI, ContingentEmployee } from '@/lib/store/workflow-store-api';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

interface PlanFormData {
  selectedDepartments: string[];
  useCommonDates: boolean;
  commonStartDate: string;
  commonEndDate: string;
  departmentDates: Record<string, { startDate: string; endDate: string }>;
  harmfulFactors: string[];
  selectedDoctors: string[];
}

export default function CreateCalendarPlanPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const contractId = params.contractId as string;
  
  const [contract, setContract] = useState<any>(null);
  const [contingent, setContingent] = useState<ContingentEmployee[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState<PlanFormData>({
    selectedDepartments: [],
    useCommonDates: true,
    commonStartDate: '',
    commonEndDate: '',
    departmentDates: {},
    harmfulFactors: [],
    selectedDoctors: [],
  });

  useEffect(() => {
    if (contractId) {
      loadData();
    }
  }, [contractId]);

  const loadData = async () => {
    try {
      // Загружаем основную информацию о договоре
      const contracts = await workflowStoreAPI.getContracts();
      const foundContract = contracts.find((c: any) => c.id.toString() === contractId);
      
      if (!foundContract) {
        showToast('Договор не найден', 'error');
        router.push('/dashboard/clinic/contracts');
        return;
      }

      setContract(foundContract);

      // Загружаем контингент для этого договора
      const allContingent = await workflowStoreAPI.getContingent();
      const contractContingent = allContingent.filter((emp) => 
        emp.contractId === contractId
      );
      
      if (contractContingent.length === 0) {
        showToast('Для этого договора нет загруженного контингента', 'warning');
        router.push(`/dashboard/clinic/contracts/${contractId}/calendar-plan`);
        return;
      }

      setContingent(contractContingent);
      
      // Получаем уникальные участки
      const departments = [...new Set(contractContingent.map((emp) => emp.department))];
      setAvailableDepartments(departments);
      
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Ошибка загрузки данных', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDepartmentToggle = (department: string) => {
    setFormData(prev => ({
      ...prev,
      selectedDepartments: prev.selectedDepartments.includes(department)
        ? prev.selectedDepartments.filter(d => d !== department)
        : [...prev.selectedDepartments, department]
    }));
  };

  const handleCreatePlan = async () => {
    if (formData.selectedDepartments.length === 0) {
      showToast('Выберите хотя бы один участок', 'warning');
      return;
    }

    if (formData.useCommonDates) {
      if (!formData.commonStartDate || !formData.commonEndDate) {
        showToast('Укажите даты начала и окончания', 'warning');
        return;
      }
    } else {
      for (const dept of formData.selectedDepartments) {
        const dates = formData.departmentDates[dept];
        if (!dates?.startDate || !dates?.endDate) {
          showToast(`Укажите даты для участка "${dept}"`, 'warning');
          return;
        }
      }
    }

    setIsCreating(true);
    
    try {
      // Создаем планы для каждого выбранного участка
      for (const department of formData.selectedDepartments) {
        const departmentEmployees = contingent.filter(emp => emp.department === department);
        const employeeIds = departmentEmployees.map(emp => emp.id);
        
        const startDate = formData.useCommonDates 
          ? formData.commonStartDate 
          : formData.departmentDates[department]?.startDate;
        const endDate = formData.useCommonDates 
          ? formData.commonEndDate 
          : formData.departmentDates[department]?.endDate;

        const planData = {
          contractId,
          department,
          startDate,
          endDate,
          employeeIds,
          harmfulFactors: formData.harmfulFactors,
          selectedDoctors: formData.selectedDoctors,
        };

        await workflowStoreAPI.addCalendarPlan(planData, employeeIds);
      }

      showToast('Календарные планы успешно созданы', 'success');
      router.push(`/dashboard/clinic/contracts/${contractId}/calendar-plan`);
      
    } catch (error) {
      console.error('Error creating calendar plan:', error);
      showToast('Ошибка при создании календарного плана', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Хлебные крошки */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Link href="/dashboard/clinic/contracts" className="hover:text-blue-600 dark:hover:text-blue-400">
              Договоры
            </Link>
            <span>/</span>
            <Link href={`/dashboard/clinic/contracts/${contractId}`} className="hover:text-blue-600 dark:hover:text-blue-400">
              Договор №{contract?.contract_number}
            </Link>
            <span>/</span>
            <Link href={`/dashboard/clinic/contracts/${contractId}/calendar-plan`} className="hover:text-blue-600 dark:hover:text-blue-400">
              Календарные планы
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white">Создание плана</span>
          </div>

          {/* Заголовок */}
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/clinic/contracts/${contractId}/calendar-plan`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Создание календарного плана
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Договор №{contract?.contract_number} от {contract && new Date(contract.contract_date).toLocaleDateString('ru-RU')}
              </p>
            </div>
          </div>

          {/* Форма создания */}
          <Card className="p-6">
            <div className="space-y-6">
              {/* Выбор участков */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Выберите участки для календарного плана
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableDepartments.map((department) => {
                    const departmentEmployees = contingent.filter(emp => emp.department === department);
                    const isSelected = formData.selectedDepartments.includes(department);
                    
                    return (
                      <div
                        key={department}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        onClick={() => handleDepartmentToggle(department)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {department}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {departmentEmployees.length} сотрудников
                            </p>
                          </div>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Настройка дат */}
              {formData.selectedDepartments.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Настройка дат проведения осмотров
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Переключатель общих дат */}
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="useCommonDates"
                        checked={formData.useCommonDates}
                        onChange={(e) => setFormData(prev => ({ ...prev, useCommonDates: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="useCommonDates" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Использовать общие даты для всех участков
                      </label>
                    </div>

                    {formData.useCommonDates ? (
                      /* Общие даты */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Дата начала
                          </label>
                          <input
                            type="date"
                            value={formData.commonStartDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, commonStartDate: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Дата окончания
                          </label>
                          <input
                            type="date"
                            value={formData.commonEndDate}
                            onChange={(e) => setFormData(prev => ({ ...prev, commonEndDate: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                          />
                        </div>
                      </div>
                    ) : (
                      /* Индивидуальные даты для каждого участка */
                      <div className="space-y-4">
                        {formData.selectedDepartments.map((department) => (
                          <div key={department} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                              {department}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Дата начала
                                </label>
                                <input
                                  type="date"
                                  value={formData.departmentDates[department]?.startDate || ''}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    departmentDates: {
                                      ...prev.departmentDates,
                                      [department]: {
                                        ...prev.departmentDates[department],
                                        startDate: e.target.value
                                      }
                                    }
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Дата окончания
                                </label>
                                <input
                                  type="date"
                                  value={formData.departmentDates[department]?.endDate || ''}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    departmentDates: {
                                      ...prev.departmentDates,
                                      [department]: {
                                        ...prev.departmentDates[department],
                                        endDate: e.target.value
                                      }
                                    }
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Кнопки действий */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Link href={`/dashboard/clinic/contracts/${contractId}/calendar-plan`}>
                  <Button variant="outline">
                    Отмена
                  </Button>
                </Link>
                <Button 
                  onClick={handleCreatePlan}
                  disabled={isCreating || formData.selectedDepartments.length === 0}
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Создание...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Создать план
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}