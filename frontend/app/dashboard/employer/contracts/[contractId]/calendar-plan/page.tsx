'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, Calendar, CheckCircle, Clock, AlertCircle, XCircle, Eye, Download } from 'lucide-react';
import { workflowStoreAPI, CalendarPlan } from '@/lib/store/workflow-store-api';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

export default function EmployerContractCalendarPlanPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const contractId = params.contractId as string;
  
  const [contract, setContract] = useState<any>(null);
  const [calendarPlans, setCalendarPlans] = useState<CalendarPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        router.push('/dashboard/employer/contracts');
        return;
      }

      setContract(foundContract);

      // Загружаем календарные планы для этого договора
      const plansData = await workflowStoreAPI.getCalendarPlansByContract(contractId);
      setCalendarPlans(plansData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Ошибка загрузки данных', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprovePlan = async (planId: string) => {
    if (!confirm('Вы уверены, что хотите утвердить этот календарный план?')) return;
    
    try {
      await workflowStoreAPI.updateCalendarPlanStatus(planId, 'approved');
      showToast('Календарный план утвержден', 'success');
      loadData(); // Перезагружаем данные
    } catch (error: any) {
      showToast(error.message || 'Ошибка утверждения плана', 'error');
    }
  };

  const handleRejectPlan = async (planId: string) => {
    const reason = prompt('Укажите причину отклонения календарного плана:');
    if (!reason || !reason.trim()) {
      showToast('Причина отклонения обязательна', 'warning');
      return;
    }
    
    try {
      await workflowStoreAPI.updateCalendarPlanStatus(planId, 'rejected', reason);
      showToast('Календарный план отклонен', 'success');
      loadData(); // Перезагружаем данные
    } catch (error: any) {
      showToast(error.message || 'Ошибка отклонения плана', 'error');
    }
  };

  const getPlanStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Черновик',
      pending_clinic: 'Ожидает согласования клиники',
      pending_employer: 'Ожидает вашего согласования',
      approved: 'Утвержден',
      rejected: 'Отклонен',
      sent_to_ses: 'Отправлен в СЭС',
    };
    return labels[status] || status;
  };

  const getPlanStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      pending_clinic: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      pending_employer: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      sent_to_ses: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPlanStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      draft: Clock,
      pending_clinic: Clock,
      pending_employer: AlertCircle,
      approved: CheckCircle,
      rejected: XCircle,
      sent_to_ses: CheckCircle,
    };
    return icons[status] || Clock;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Договор не найден
          </h2>
          <Link href="/dashboard/employer/contracts">
            <Button>Вернуться к списку договоров</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Хлебные крошки */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Link href="/dashboard/employer/contracts" className="hover:text-blue-600 dark:hover:text-blue-400">
              Договоры
            </Link>
            <span>/</span>
            <Link href={`/dashboard/employer/contracts/${contractId}`} className="hover:text-blue-600 dark:hover:text-blue-400">
              Договор №{contract.contract_number}
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white">Календарные планы</span>
          </div>

          {/* Заголовок */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/dashboard/employer/contracts/${contractId}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Назад к договору
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Календарные планы
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Договор №{contract.contract_number} от {new Date(contract.contract_date).toLocaleDateString('ru-RU')}
                </p>
              </div>
            </div>
          </div>

          {/* Список календарных планов */}
          {calendarPlans.length === 0 ? (
            <Card className="p-12 text-center">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Календарные планы не созданы
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Клиника еще не создала календарные планы для этого договора
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {calendarPlans.map((plan, index) => {
                const StatusIcon = getPlanStatusIcon(plan.status);
                
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg ${getPlanStatusColor(plan.status).split(' ')[0]}`}>
                            <StatusIcon className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {plan.department}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(plan.startDate).toLocaleDateString('ru-RU')} - {new Date(plan.endDate).toLocaleDateString('ru-RU')}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPlanStatusColor(plan.status)}`}>
                          {getPlanStatusLabel(plan.status)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Сотрудников</p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {plan.employeeIds.length}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Участков</p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {plan.departmentsInfo?.length || 1}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                            <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Создан</p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {new Date(plan.createdAt).toLocaleDateString('ru-RU')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Вредных факторов</p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {plan.harmfulFactors?.length || 0}
                            </p>
                          </div>
                        </div>
                      </div>

                      {plan.harmfulFactors && plan.harmfulFactors.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Вредные факторы:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {plan.harmfulFactors.slice(0, 3).map((factor, idx) => (
                              <span key={idx} className="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded">
                                {factor.length > 30 ? `${factor.substring(0, 30)}...` : factor}
                              </span>
                            ))}
                            {plan.harmfulFactors.length > 3 && (
                              <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                                +{plan.harmfulFactors.length - 3} еще
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {plan.rejectionReason && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                            Причина отклонения:
                          </p>
                          <p className="text-sm text-red-700 dark:text-red-300">
                            {plan.rejectionReason}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Просмотр
                        </Button>
                        
                        {plan.status === 'pending_employer' && (
                          <>
                            <Button 
                              size="sm" 
                              onClick={() => handleApprovePlan(plan.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Утвердить
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleRejectPlan(plan.id)}
                              className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Отклонить
                            </Button>
                          </>
                        )}
                        
                        {plan.status === 'approved' && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            <Download className="h-4 w-4 mr-1" />
                            Скачать PDF
                          </Button>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Статистика */}
          {calendarPlans.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {calendarPlans.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Всего планов
                </div>
              </Card>
              
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {calendarPlans.filter(plan => plan.status === 'pending_employer').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Ожидают утверждения
                </div>
              </Card>
              
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {calendarPlans.filter(plan => plan.status === 'approved').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Утверждены
                </div>
              </Card>
              
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {calendarPlans.filter(plan => plan.status === 'rejected').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Отклонены
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}