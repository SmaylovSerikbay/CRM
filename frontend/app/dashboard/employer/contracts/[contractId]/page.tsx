'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, Users, Calendar, Route, FileText, CheckCircle, Clock, AlertCircle, History, ChevronDown, ChevronUp } from 'lucide-react';
import { workflowStoreAPI } from '@/lib/store/workflow-store-api';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

interface Contract {
  id: string;
  contract_number: string;
  contract_date: string;
  amount: number;
  people_count: number;
  execution_date: string;
  status: string;
  employer_bin?: string;
  employer_phone?: string;
  employer_name?: string;
  clinic_name?: string;
  notes?: string;
  createdAt: string;
}

interface ContractHistoryItem {
  id: string;
  action: string;
  user_role: string;
  user_name: string;
  comment: string;
  old_status: string;
  new_status: string;
  changes: any;
  created_at: string;
}

export default function EmployerContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const contractId = params.contractId as string;
  
  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [contingentCount, setContingentCount] = useState(0);
  const [plansCount, setPlansCount] = useState(0);
  const [routeSheetsCount, setRouteSheetsCount] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [contractHistory, setContractHistory] = useState<ContractHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (contractId) {
      loadContractDetails();
    }
  }, [contractId]);

  const loadContractDetails = async () => {
    try {
      // Загружаем основную информацию о договоре
      const contracts = await workflowStoreAPI.getContracts();
      const foundContract = contracts.find((c: any) => c.id.toString() === contractId);
      
      if (!foundContract) {
        showToast('Договор не найден', 'error');
        router.push('/dashboard/employer/contracts');
        return;
      }

      setContract({
        id: foundContract.id.toString(),
        contract_number: foundContract.contract_number,
        contract_date: foundContract.contract_date,
        amount: foundContract.amount,
        people_count: foundContract.people_count,
        execution_date: foundContract.execution_date,
        status: foundContract.status,
        employer_bin: foundContract.employer_bin,
        employer_phone: foundContract.employer_phone,
        employer_name: foundContract.employer_name,
        clinic_name: foundContract.clinic_name,
        notes: foundContract.notes,
        createdAt: foundContract.created_at,
      });

      // Загружаем счетчики (быстро, без полных данных)
      loadCounts();
    } catch (error) {
      console.error('Error loading contract:', error);
      showToast('Ошибка загрузки договора', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCounts = async () => {
    try {
      // Используем быстрый API для получения только счетчиков
      try {
        const counts = await workflowStoreAPI.getContractCounts(contractId);
        
        setContingentCount(counts.contingent_count);
        setPlansCount(counts.plans_count);
        setRouteSheetsCount(counts.route_sheets_count);
      } catch (error) {
        console.error('Error loading counts via fast API, falling back to individual requests:', error);
        
        // Fallback: выполняем все запросы параллельно для ускорения загрузки
        const [contingentResult, plansResult, routeResult] = await Promise.allSettled([
          workflowStoreAPI.getContingentByContract(contractId),
          workflowStoreAPI.getCalendarPlansByContract(contractId),
          workflowStoreAPI.getRouteSheets()
        ]);

        // Обрабатываем результат контингента
        let contingentData = [];
        if (contingentResult.status === 'fulfilled') {
          contingentData = contingentResult.value;
        } else {
          console.error('Error loading contingent:', contingentResult.reason);
        }

        // Обрабатываем результат планов
        let plansData = [];
        if (plansResult.status === 'fulfilled') {
          plansData = plansResult.value;
        } else {
          console.error('Error loading plans:', plansResult.reason);
        }

        // Обрабатываем результат маршрутных листов
        let routeData = [];
        if (routeResult.status === 'fulfilled') {
          routeData = routeResult.value;
        } else {
          console.error('Error loading route sheets:', routeResult.reason);
        }

        setContingentCount(contingentData.length);
        setPlansCount(plansData.length);
        setRouteSheetsCount(routeData.length);
      }
    } catch (error) {
      console.error('Error loading counts:', error);
    }
  };

  const handleShowHistory = async () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    
    setIsLoadingHistory(true);
    try {
      const history = await workflowStoreAPI.getContractHistory(contractId);
      setContractHistory(history);
      setShowHistory(true);
    } catch (error: any) {
      showToast(error.message || 'Ошибка загрузки истории', 'error');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      created: 'Создан',
      updated: 'Обновлен',
      sent_for_approval: 'Отправлен на согласование',
      approved: 'Согласован',
      rejected: 'Отклонен',
      resent_for_approval: 'Повторно отправлен на согласование',
      cancelled: 'Отменен',
      executed: 'Исполнен',
    };
    return labels[action] || action;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Черновик',
      pending_approval: 'Ожидает согласования',
      approved: 'Согласован',
      active: 'Действует',
      in_progress: 'В процессе исполнения',
      partially_executed: 'Частично исполнен',
      rejected: 'Отклонен',
      sent: 'Отправлен',
      executed: 'Исполнен',
      cancelled: 'Отменен',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      pending_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      active: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      in_progress: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      partially_executed: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      executed: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
        <span className="text-gray-900 dark:text-white">Договор №{contract.contract_number}</span>
      </div>

      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/employer/contracts">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Договор №{contract.contract_number}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              от {new Date(contract.contract_date).toLocaleDateString('ru-RU')}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(contract.status)}`}>
          {getStatusLabel(contract.status)}
        </span>
      </div>

      {/* Основная информация */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Сумма договора</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {contract.amount?.toLocaleString('ru-RU')} ₸
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Количество людей</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {contract.people_count}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Срок исполнения</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {new Date(contract.execution_date).toLocaleDateString('ru-RU')}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Создан</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {new Date(contract.createdAt).toLocaleDateString('ru-RU')}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Информация о клинике */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Информация о клинике</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShowHistory}
            disabled={isLoadingHistory}
          >
            <History className="h-4 w-4 mr-2" />
            {isLoadingHistory ? 'Загрузка...' : showHistory ? 'Скрыть историю' : 'История договора'}
            {!isLoadingHistory && (
              showHistory ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />
            )}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Название клиники</p>
            <p className="font-medium">{contract.clinic_name || 'Не указано'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Ваш БИН</p>
            <p className="font-medium">{contract.employer_bin || 'Не указан'}</p>
          </div>
        </div>
        {contract.notes && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Примечания</p>
            <p className="font-medium">{contract.notes}</p>
          </div>
        )}
      </Card>

      {/* История договора */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">История изменений</h3>
              {contractHistory.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                  История изменений пуста
                </p>
              ) : (
                <div className="space-y-4">
                  {contractHistory.map((item) => (
                    <div key={item.id} className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {getActionLabel(item.action)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(item.created_at).toLocaleString('ru-RU')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p>Пользователь: {item.user_name} ({item.user_role === 'clinic' ? 'Клиника' : 'Работодатель'})</p>
                        {item.old_status && item.new_status && (
                          <p>Статус: {item.old_status} → {item.new_status}</p>
                        )}
                        {item.comment && (
                          <p className="mt-1 italic">"{item.comment}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Разделы управления */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href={`/dashboard/employer/contracts/${contractId}/contingent`}>
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Контингент</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {contingentCount} сотрудников
                  </p>
                </div>
              </div>
              {contingentCount > 0 && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </div>
          </Card>
        </Link>

        <Link href={`/dashboard/employer/contracts/${contractId}/calendar-plan`}>
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-800 transition-colors">
                  <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Календарные планы</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {plansCount} планов
                  </p>
                </div>
              </div>
              {plansCount > 0 && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </div>
          </Card>
        </Link>

        <Link href={`/dashboard/employer/contracts/${contractId}/route-sheets`}>
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-800 transition-colors">
                  <Route className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Маршрутные листы</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {routeSheetsCount} листов
                  </p>
                </div>
              </div>
              {routeSheetsCount > 0 && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </div>
          </Card>
        </Link>
      </div>
        </div>
      </main>
    </div>
  );
}