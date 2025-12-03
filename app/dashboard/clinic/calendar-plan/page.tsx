'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Calendar, Download, CheckCircle, Clock, Users, AlertCircle, UserCheck } from 'lucide-react';
import { workflowStoreAPI, CalendarPlan, ContingentEmployee } from '@/lib/store/workflow-store-api';
import { apiClient } from '@/lib/api/client';

export default function CalendarPlanPage() {
  const [plans, setPlans] = useState<CalendarPlan[]>([]);
  const [contingent, setContingent] = useState<ContingentEmployee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    department: '',
    startDate: '',
    endDate: '',
    harmfulFactors: [] as string[],
    selectedDoctors: [] as string[],
  });
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [harmfulFactorsList, setHarmfulFactorsList] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Загружаем контингент (доступен для всех клиник после загрузки работодателем)
        const contingentData = await workflowStoreAPI.getContingent();
        setContingent(contingentData);
        
        // Получаем уникальные отделы
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

  const getContingentByDepartment = (department: string): ContingentEmployee[] => {
    return contingent.filter(emp => emp.department === department);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Получаем сотрудников выбранного отдела
      const departmentEmployees = getContingentByDepartment(formData.department);
      const employeeIds = departmentEmployees.map(emp => emp.id);

      // Создаем план через API
      await workflowStoreAPI.addCalendarPlan({
        department: formData.department,
        startDate: formData.startDate,
        endDate: formData.endDate,
        employeeIds,
        harmfulFactors: formData.harmfulFactors,
        selectedDoctors: formData.selectedDoctors,
      }, employeeIds);

      // Обновляем список планов
      const updatedPlans = await workflowStoreAPI.getCalendarPlans();
      setPlans(updatedPlans);
      
      setFormData({ department: '', startDate: '', endDate: '', harmfulFactors: [], selectedDoctors: [] });
      setShowForm(false);
    } catch (error: any) {
      alert(error.message || 'Ошибка создания плана');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      // Клиника жмет "Согласовано" и отправляет план на утверждение работодателю
      await workflowStoreAPI.updateCalendarPlanStatus(id, 'pending_employer');
      const updatedPlans = await workflowStoreAPI.getCalendarPlans();
      setPlans(updatedPlans);
    } catch (error: any) {
      alert(error.message || 'Ошибка утверждения плана');
    }
  };

  const handleSendToSES = async (id: string) => {
    try {
      await workflowStoreAPI.updateCalendarPlanStatus(id, 'sent_to_ses');
      const updatedPlans = await workflowStoreAPI.getCalendarPlans();
      setPlans(updatedPlans);
    } catch (error: any) {
      alert(error.message || 'Ошибка отправки в СЭС');
    }
  };

  const handleGeneratePDF = (plan: CalendarPlan) => {
    // Симуляция генерации PDF
    alert(`Генерация PDF календарного плана для ${plan.department}...`);
  };

  const getEmployeeCount = (plan: CalendarPlan) => {
    return plan.employeeIds.length;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div>
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Календарный план</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Планирование осмотров по потокам. После загрузки списка система предлагает свободные слоты. Менеджер клиники генерирует PDF «Календарный план», обе стороны жмут «Согласовано». После утверждения план отправляется в СЭС.
              </p>
            </div>
            <Button onClick={() => setShowForm(!showForm)} disabled={availableDepartments.length === 0}>
              <Calendar className="h-4 w-4 mr-2" />
              Создать план
            </Button>
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
                  Сначала работодатель должен загрузить список контингента
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
              <h2 className="text-xl font-semibold mb-4">Создать календарный план</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Цех/Отдел
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                    >
                      <option value="">Выберите отдел</option>
                      {availableDepartments.map(dept => {
                        const count = getContingentByDepartment(dept).length;
                        return (
                          <option key={dept} value={dept}>
                            {dept} ({count} сотрудников)
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <Input
                    type="date"
                    label="Дата начала"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                  <Input
                    type="date"
                    label="Дата окончания"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
                
                {/* Вредные факторы */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Вредные факторы (для формирования приказа медкомиссии)
                  </label>
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
                          className="rounded border-gray-300 text-black focus:ring-black"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{factor}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Выбор врачей */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Врачи клиники, которые будут проводить осмотр
                  </label>
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
                          className="rounded border-gray-300 text-black focus:ring-black"
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
                
                <div className="flex gap-4">
                  <Button type="submit" className="flex-1">
                    Создать план
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Отмена
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}

        {/* Plans List */}
        <div className="space-y-4">
          {plans.map((plan, index) => (
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

                    <div className="flex items-center gap-4">
                      {plan.status === 'draft' && (
                        <span className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full">
                          Черновик
                        </span>
                      )}
                      {plan.status === 'pending_clinic' && (
                        <span className="px-3 py-1 text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Ожидает утверждения клиникой
                        </span>
                      )}
                      {plan.status === 'pending_employer' && (
                        <span className="px-3 py-1 text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Ожидает утверждения работодателем
                        </span>
                      )}
                      {plan.status === 'approved' && (
                        <span className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Утвержден обеими сторонами
                        </span>
                      )}
                      {plan.status === 'sent_to_ses' && (
                        <span className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                          Отправлен в СЭС
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {plan.status === 'draft' && (
                      <>
                        <Button size="sm" onClick={() => handleApprove(plan.id)}>
                          Согласовано (Клиника) - Отправить работодателю
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleGeneratePDF(plan)}>
                          <Download className="h-4 w-4 mr-2" />
                          Генерировать PDF
                        </Button>
                      </>
                    )}
                    {plan.status === 'pending_employer' && (
                      <>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Ожидает утверждения работодателем
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleGeneratePDF(plan)}>
                          <Download className="h-4 w-4 mr-2" />
                          Просмотреть PDF
                        </Button>
                      </>
                    )}
                    {plan.status === 'approved' && (
                      <>
                        <Button size="sm" onClick={() => handleSendToSES(plan.id)}>
                          Отправить в СЭС
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleGeneratePDF(plan)}>
                          <Download className="h-4 w-4 mr-2" />
                          Скачать PDF
                        </Button>
                      </>
                    )}
                    {plan.status === 'sent_to_ses' && (
                      <Button size="sm" variant="outline" onClick={() => handleGeneratePDF(plan)}>
                        <Download className="h-4 w-4 mr-2" />
                        Скачать PDF
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {plans.length === 0 && !showForm && (
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
        )}
      </main>
    </div>
  );
}
