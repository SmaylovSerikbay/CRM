'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { 
  FileText, CheckCircle, Clock, Send, X, Download, Upload, History, 
  Search, Filter, Building2, Calendar, Users, DollarSign, ChevronRight,
  AlertCircle, CheckCircle2, XCircle, Hourglass, Ban, Eye, MoreVertical
} from 'lucide-react';
import { workflowStoreAPI } from '@/lib/store/workflow-store-api';
import { userStore } from '@/lib/store/user-store';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

interface Contract {
  id: string;
  contract_number: string;
  contract_date: string;
  amount: number;
  people_count: number;
  execution_date: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'executed' | 'cancelled';
  employer_bin?: string;
  employer_phone?: string;
  employer_name?: string;
  clinic_name?: string;
  notes?: string;
  createdAt: string;
  approvedByEmployerAt?: string;
  approvedByClinicAt?: string;
  sentAt?: string;
  executedAt?: string;
  history?: any[];
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

function EmployerContractsContent() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const binFromUrl = searchParams.get('bin');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [contractHistory, setContractHistory] = useState<ContractHistoryItem[]>([]);
  
  // Фильтры и поиск
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    loadContracts();
    
    if (binFromUrl) {
      setTimeout(() => {
        showToast('Вам отправлен договор на согласование. Пожалуйста, ознакомьтесь и подпишите его.', 'info', 8000);
      }, 500);
    }
  }, [binFromUrl]);

  const loadContracts = async () => {
    try {
      const data: any[] = await workflowStoreAPI.getContracts();
      const mappedContracts: Contract[] = data.map((c: any) => ({
        id: c.id.toString(),
        contract_number: c.contract_number,
        contract_date: c.contract_date,
        amount: typeof c.amount === 'string' ? parseFloat(c.amount) : c.amount,
        people_count: c.people_count,
        execution_date: c.execution_date,
        status: c.status,
        employer_bin: c.employer_bin,
        employer_phone: c.employer_phone,
        employer_name: c.employer_name,
        clinic_name: c.clinic_name,
        notes: c.notes,
        createdAt: c.created_at,
        approvedByEmployerAt: c.approved_by_employer_at,
        approvedByClinicAt: c.approved_by_clinic_at,
        sentAt: c.sent_at,
        executedAt: c.executed_at,
      }));
      setContracts(mappedContracts);
      
      if (binFromUrl) {
        const contract = mappedContracts.find((c: Contract) => c.employer_bin === binFromUrl);
        if (contract) {
          setSelectedContract(contract);
        }
      }
    } catch (error) {
      console.error('Error loading contracts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (contractId: string) => {
    if (!confirm('Вы уверены, что хотите подписать этот договор?')) return;
    
    try {
      await workflowStoreAPI.approveContract(contractId);
      await new Promise(resolve => setTimeout(resolve, 300));
      await loadContracts();
      setSelectedContract(null);
      showToast('Договор успешно подписан!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка подписания договора', 'error');
    }
  };

  const handleReject = async (contractId: string) => {
    if (!rejectReason.trim()) {
      showToast('Пожалуйста, укажите причину отклонения', 'warning');
      return;
    }
    
    try {
      await workflowStoreAPI.rejectContract(contractId, rejectReason);
      showToast('Договор отклонен. Клиника получит уведомление.', 'success');
      setRejectReason('');
      setShowRejectForm(null);
      loadContracts();
    } catch (error: any) {
      showToast(error.message || 'Ошибка отклонения договора', 'error');
    }
  };

  const handleExecute = async (contractId: string) => {
    if (!confirm('Отметить договор как исполненный?')) return;
    
    try {
      await workflowStoreAPI.executeContract(contractId);
      showToast('Договор отмечен как исполненный!', 'success');
      loadContracts();
      setSelectedContract(null);
    } catch (error: any) {
      showToast(error.message || 'Ошибка', 'error');
    }
  };

  const handleShowHistory = async (contractId: string) => {
    try {
      const history = await workflowStoreAPI.getContractHistory(contractId);
      setContractHistory(history);
      setShowHistory(contractId);
    } catch (error: any) {
      showToast(error.message || 'Ошибка загрузки истории', 'error');
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

  // Фильтрация и поиск
  const filteredContracts = useMemo(() => {
    return contracts.filter((contract: Contract) => {
      const matchesSearch = searchQuery === '' || 
        contract.contract_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (contract.clinic_name && contract.clinic_name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [contracts, searchQuery, statusFilter]);

  // Пагинация
  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedContracts = filteredContracts.slice(startIndex, endIndex);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; icon: any; colors: string }> = {
      draft: {
        label: 'Черновик',
        icon: FileText,
        colors: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700'
      },
      pending_approval: {
        label: 'Ожидает согласования',
        icon: Hourglass,
        colors: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
      },
      approved: {
        label: 'Согласован',
        icon: CheckCircle2,
        colors: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
      },
      rejected: {
        label: 'Отклонен',
        icon: XCircle,
        colors: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
      },
      sent: {
        label: 'Отправлен',
        icon: Send,
        colors: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
      },
      executed: {
        label: 'Исполнен',
        icon: CheckCircle,
        colors: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800'
      },
      cancelled: {
        label: 'Отменен',
        icon: Ban,
        colors: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
      },
    };
    return configs[status] || configs.draft;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Улучшенный Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 flex-shrink-0 shadow-sm">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Договоры</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Управление договорами с клиниками
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {filteredContracts.length}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {filteredContracts.length === contracts.length ? 'Всего договоров' : 'Найдено'}
                </div>
              </div>
            </div>
          </div>

          {/* Поиск и фильтры */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Поиск по номеру договора или клинике..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 h-11"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="h-11 px-4"
              >
                <Filter className="h-4 w-4 mr-2" />
                Фильтры
                {statusFilter !== 'all' && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                    1
                  </span>
                )}
              </Button>
            </div>

            {/* Панель фильтров */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <Card className="p-4 bg-gray-50 dark:bg-gray-800/50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Статус
                        </label>
                        <select
                          value={statusFilter}
                          onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        >
                          <option value="all">Все статусы</option>
                          <option value="draft">Черновик</option>
                          <option value="pending_approval">Ожидает согласования</option>
                          <option value="approved">Согласован</option>
                          <option value="rejected">Отклонен</option>
                          <option value="sent">Отправлен</option>
                          <option value="executed">Исполнен</option>
                          <option value="cancelled">Отменен</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setStatusFilter('all');
                            setSearchQuery('');
                            setCurrentPage(1);
                          }}
                          className="w-full"
                        >
                          Сбросить фильтры
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        {binFromUrl && contracts.length === 0 && (
          <Card className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="p-4">
              <p className="text-blue-800 dark:text-blue-200">
                Вам отправлен договор с БИН: {binFromUrl}. Если у вас еще нет аккаунта, пожалуйста, зарегистрируйтесь.
              </p>
            </div>
          </Card>
        )}

        {filteredContracts.length === 0 ? (
          <Card>
            <div className="text-center py-16">
              <FileText className="h-16 w-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {searchQuery || statusFilter !== 'all' ? 'Ничего не найдено' : 'Нет договоров'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Попробуйте изменить параметры поиска или фильтры'
                  : 'Договоры с клиниками будут отображаться здесь после их создания'}
              </p>
              {(searchQuery || statusFilter !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                >
                  Очистить фильтры
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {paginatedContracts.map((contract: Contract, index: number) => {
              const statusConfig = getStatusConfig(contract.status);
              const StatusIcon = statusConfig.icon;
              
              return (
                <motion.div
                  key={contract.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-200 border-gray-200 dark:border-gray-800">
                    <div className="p-6">
                      {/* Заголовок карточки */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                                <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                  Договор №{contract.contract_number}
                                </h3>
                                {contract.clinic_name && (
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <Building2 className="h-3.5 w-3.5 text-gray-400" />
                                    <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                      {contract.clinic_name}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${statusConfig.colors}`}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              <span>{statusConfig.label}</span>
                            </div>
                          </div>

                          {/* Основная информация */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 mt-0.5">
                                <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                  Дата договора
                                </p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {new Date(contract.contract_date).toLocaleDateString('ru-RU')}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 mt-0.5">
                                <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                  Сумма
                                </p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {contract.amount.toLocaleString('ru-RU')} ₸
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 mt-0.5">
                                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                  Сотрудников
                                </p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {contract.people_count}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 mt-0.5">
                                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                  Исполнение
                                </p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {new Date(contract.execution_date).toLocaleDateString('ru-RU')}
                                </p>
                              </div>
                            </div>
                          </div>

                          {contract.notes && (
                            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                Примечания
                              </p>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {contract.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Действия */}
                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-2">
                          {(contract.status === 'sent' || contract.status === 'pending_approval') && !contract.approvedByEmployerAt ? (
                            <>
                              <Button 
                                onClick={() => handleApprove(contract.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Подписать
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={() => setShowRejectForm(showRejectForm === contract.id ? null : contract.id)}
                                className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Отклонить
                              </Button>
                            </>
                          ) : contract.status === 'approved' ? (
                            <Button 
                              onClick={() => handleExecute(contract.id)} 
                              variant="outline"
                              className="border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Отметить исполненным
                            </Button>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedContract(selectedContract?.id === contract.id ? null : contract)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {selectedContract?.id === contract.id ? 'Скрыть' : 'Подробнее'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShowHistory(contract.id)}
                          >
                            <History className="h-4 w-4 mr-2" />
                            История
                          </Button>
                        </div>
                      </div>

                      {/* Форма отклонения */}
                      <AnimatePresence>
                        {showRejectForm === contract.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 overflow-hidden"
                          >
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Причина отклонения</h4>
                            <textarea
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Укажите причину отклонения договора..."
                              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent resize-none"
                              rows={4}
                              required
                            />
                            <div className="flex gap-2 mt-3">
                              <Button 
                                onClick={() => handleReject(contract.id)} 
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                Отклонить договор
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={() => { setShowRejectForm(null); setRejectReason(''); }}
                              >
                                Отмена
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* История */}
                      <AnimatePresence>
                        {showHistory === contract.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 overflow-hidden"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-semibold text-gray-900 dark:text-white">История изменений</h4>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowHistory(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                              {contractHistory.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                  Нет записей в истории
                                </p>
                              ) : (
                                contractHistory.map((item: ContractHistoryItem) => {
                                  const itemStatusConfig = getStatusConfig(item.new_status || item.old_status);
                                  const ItemStatusIcon = itemStatusConfig.icon;
                                  return (
                                    <div key={item.id} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                      <div className="flex-shrink-0 mt-0.5">
                                        <div className={`p-2 rounded-lg ${itemStatusConfig.colors.split(' ')[0]}`}>
                                          <ItemStatusIcon className="h-4 w-4" />
                                        </div>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                                            {getActionLabel(item.action)}
                                          </span>
                                          {item.new_status && (
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${itemStatusConfig.colors}`}>
                                              {itemStatusConfig.label}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                          {item.user_name || 'Система'} ({item.user_role === 'clinic' ? 'Клиника' : 'Работодатель'})
                                        </p>
                                        {item.comment && (
                                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                            {item.comment}
                                          </p>
                                        )}
                                        <p className="text-xs text-gray-400 dark:text-gray-500">
                                          {new Date(item.created_at).toLocaleString('ru-RU')}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Детальная информация */}
                      <AnimatePresence>
                        {selectedContract?.id === contract.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 overflow-hidden"
                          >
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Детальная информация</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ID договора</p>
                                <p className="font-medium text-gray-900 dark:text-white">{contract.id}</p>
                              </div>
                              {contract.createdAt && (
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Создан</p>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {new Date(contract.createdAt).toLocaleString('ru-RU')}
                                  </p>
                                </div>
                              )}
                              {contract.approvedByEmployerAt && (
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Подписан работодателем</p>
                                  <p className="font-medium text-emerald-600 dark:text-emerald-400">
                                    {new Date(contract.approvedByEmployerAt).toLocaleString('ru-RU')}
                                  </p>
                                </div>
                              )}
                              {contract.approvedByClinicAt && (
                                <div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Подписан клиникой</p>
                                  <p className="font-medium text-emerald-600 dark:text-emerald-400">
                                    {new Date(contract.approvedByClinicAt).toLocaleString('ru-RU')}
                                  </p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
            
            {/* Улучшенная пагинация */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Страница</span>
                  <select
                    value={currentPage}
                    onChange={(e) => setCurrentPage(Number(e.target.value))}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <option key={page} value={page}>
                        {page}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-600 dark:text-gray-400">из {totalPages}</span>
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
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
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
      </main>
    </div>
  );
}

export default function EmployerContractsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    }>
      <EmployerContractsContent />
    </Suspense>
  );
}
