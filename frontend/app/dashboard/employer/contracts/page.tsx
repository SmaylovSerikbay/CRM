'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { 
  FileText, CheckCircle, Clock, Send, X, Download, Upload, History, 
  Search, Filter, Building2, Calendar, Users, DollarSign, ChevronRight,
  AlertCircle, CheckCircle2, XCircle, Hourglass, Ban, Eye, MoreVertical, Route, FileCheck
} from 'lucide-react';
import { workflowStoreAPI, ContingentEmployee, CalendarPlan } from '@/lib/store/workflow-store-api';
import { userStore } from '@/lib/store/user-store';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { Drawer } from '@/components/ui/Drawer';
import { Card } from '@/components/ui/Card';

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
  
  // Данные для Drawer
  const [contingent, setContingent] = useState<ContingentEmployee[]>([]);
  const [calendarPlans, setCalendarPlans] = useState<CalendarPlan[]>([]);
  const [routeSheets, setRouteSheets] = useState<any[]>([]);
  const [showContractDrawer, setShowContractDrawer] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'contingent' | 'plan' | 'route'>('contingent');
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [routeSheetSearch, setRouteSheetSearch] = useState('');
  const [routeSheetDateFilter, setRouteSheetDateFilter] = useState('');
  const [expandedRouteSheet, setExpandedRouteSheet] = useState<string | null>(null);
  
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
      
      // Загружаем контингент и календарные планы для Drawer
      try {
        const contingentData = await workflowStoreAPI.getContingent();
        setContingent(contingentData);
        
        const plansData = await workflowStoreAPI.getCalendarPlans();
        setCalendarPlans(plansData);
        
        const sheetsData = await workflowStoreAPI.getRouteSheets();
        setRouteSheets(sheetsData);
      } catch (error) {
        console.error('Error loading contingent/plans:', error);
      }
      
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

  // Функции для работы с Drawer
  const getContingentCount = (contractId: string): number => {
    return contingent.filter(emp => emp.contractId === contractId).length;
  };

  const getCalendarPlansCount = (contractId: string): number => {
    return calendarPlans.filter(plan => plan.contractId === contractId).length;
  };

  const hasApprovedPlan = (contractId: string): boolean => {
    return calendarPlans.some(plan => 
      plan.contractId === contractId && 
      (plan.status === 'approved' || plan.status === 'sent_to_ses')
    );
  };

  const getContractProgress = (contractId: string) => {
    const hasContingent = getContingentCount(contractId) > 0;
    const hasPlan = getCalendarPlansCount(contractId) > 0;
    const hasApproved = hasApprovedPlan(contractId);
    
    return {
      contingent: hasContingent,
      plan: hasPlan,
      approved: hasApproved,
      completed: hasContingent && hasPlan && hasApproved,
    };
  };

  const handleOpenContractDrawer = (contractId: string) => {
    setShowContractDrawer(contractId);
    setActiveTab('contingent');
  };

  const loadRouteSheetsForContract = async (contractId: string) => {
    try {
      const allSheets = await workflowStoreAPI.getRouteSheets();
      const contractEmployeeIds = contingent.filter(emp => emp.contractId === contractId).map(emp => emp.id);
      const contractSheets = allSheets.filter(rs => contractEmployeeIds.includes(rs.patientId));
      setRouteSheets(contractSheets);
    } catch (error) {
      console.error('Error loading route sheets:', error);
    }
  };

  useEffect(() => {
    if (showContractDrawer && activeTab === 'route') {
      loadRouteSheetsForContract(showContractDrawer);
    }
  }, [showContractDrawer, activeTab, contingent]);

  const getPlanStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Черновик',
      pending_clinic: 'Ожидает утверждения клиникой',
      pending_employer: 'Ожидает утверждения работодателем',
      approved: 'Утвержден',
      sent_to_ses: 'Отправлен в СЭС',
    };
    return labels[status] || status;
  };

  const getPlanStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      pending_clinic: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      pending_employer: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      sent_to_ses: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
            {/* Таблица */}
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Номер договора
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Клиника
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Дата договора
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Сумма
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Сотрудников
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                      Дата исполнения
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
                  {paginatedContracts.map((contract: Contract, index: number) => {
                    const statusConfig = getStatusConfig(contract.status);
                    const StatusIcon = statusConfig.icon;
                    const isExpanded = selectedContract?.id === contract.id || showHistory === contract.id || showRejectForm === contract.id;
                    
                    return (
                      <>
                        <motion.tr
                          key={contract.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                            isExpanded ? 'bg-gray-50 dark:bg-gray-800/30' : ''
                          }`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              №{contract.contract_number}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                              {contract.clinic_name || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-900 dark:text-white">
                              {new Date(contract.contract_date).toLocaleDateString('ru-RU')}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {contract.amount.toLocaleString('ru-RU')} ₸
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-900 dark:text-white">
                              {contract.people_count}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-900 dark:text-white">
                              {new Date(contract.execution_date).toLocaleDateString('ru-RU')}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusConfig.colors}`}>
                              <StatusIcon className="h-3.5 w-3.5 mr-1" />
                              <span>{statusConfig.label}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              {(contract.status === 'sent' || contract.status === 'pending_approval') && !contract.approvedByEmployerAt && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprove(contract.id)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Подписать
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowRejectForm(showRejectForm === contract.id ? null : contract.id)}
                                    className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Отклонить
                                  </Button>
                                </>
                              )}
                              {contract.status === 'approved' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleExecute(contract.id)}
                                  variant="outline"
                                  className="border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Исполнить
                                </Button>
                              )}
                              {/* Кнопка для утвержденных и исполненных договоров */}
                              {(contract.status === 'approved' || contract.status === 'executed') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenContractDrawer(contract.id)}
                                  title="Управление договором"
                                  className="relative"
                                >
                                  <FileCheck className="h-4 w-4 mr-2" />
                                  Документы
                                  {/* Индикатор прогресса */}
                                  <div className="ml-2 flex items-center gap-1">
                                    {(() => {
                                      const progress = getContractProgress(contract.id);
                                      return (
                                        <>
                                          <div className={`w-2 h-2 rounded-full ${progress.contingent ? 'bg-green-500' : 'bg-gray-300'}`} title="Контингент" />
                                          <div className={`w-2 h-2 rounded-full ${progress.plan ? 'bg-green-500' : 'bg-gray-300'}`} title="План" />
                                          <div className={`w-2 h-2 rounded-full ${progress.approved ? 'bg-green-500' : 'bg-gray-300'}`} title="Утвержден" />
                                        </>
                                      );
                                    })()}
                                  </div>
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedContract(selectedContract?.id === contract.id ? null : contract)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                {selectedContract?.id === contract.id ? 'Скрыть' : 'Подробнее'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleShowHistory(contract.id)}
                              >
                                <History className="h-4 w-4 mr-1" />
                                История
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                        
                        {/* Развернутая информация */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="px-4 py-3 bg-gray-50 dark:bg-gray-800/30">
                              <AnimatePresence>
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="space-y-4"
                                >
                                  {/* Форма отклонения */}
                                  {showRejectForm === contract.id && (
                                    <Card className="p-4 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
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
                                    </Card>
                                  )}

                                  {/* История */}
                                  {showHistory === contract.id && (
                                    <Card className="p-4">
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
                                    </Card>
                                  )}

                                  {/* Детальная информация */}
                                  {selectedContract?.id === contract.id && (
                                    <Card className="p-4">
                                      <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Детальная информация</h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div>
                                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ID договора</p>
                                          <p className="text-sm font-medium text-gray-900 dark:text-white">{contract.id}</p>
                                        </div>
                                        {contract.createdAt && (
                                          <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Создан</p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                              {new Date(contract.createdAt).toLocaleString('ru-RU')}
                                            </p>
                                          </div>
                                        )}
                                        {contract.approvedByEmployerAt && (
                                          <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Подписан работодателем</p>
                                            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                              {new Date(contract.approvedByEmployerAt).toLocaleString('ru-RU')}
                                            </p>
                                          </div>
                                        )}
                                        {contract.approvedByClinicAt && (
                                          <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Подписан клиникой</p>
                                            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                              {new Date(contract.approvedByClinicAt).toLocaleString('ru-RU')}
                                            </p>
                                          </div>
                                        )}
                                        {contract.notes && (
                                          <div className="col-span-full">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Примечания</p>
                                            <p className="text-sm text-gray-700 dark:text-gray-300">{contract.notes}</p>
                                          </div>
                                        )}
                                      </div>
                                    </Card>
                                  )}
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

      {/* Drawer для управления договором */}
      <Drawer
        isOpen={showContractDrawer !== null}
        onClose={() => {
          setShowContractDrawer(null);
          setActiveTab('contingent');
        }}
        title={showContractDrawer ? `Договор №${contracts.find(c => c.id === showContractDrawer)?.contract_number}` : 'Управление договором'}
        width="w-[1400px]"
      >
        {showContractDrawer && (() => {
          const contract = contracts.find(c => c.id === showContractDrawer);
          const contractContingent = contingent.filter(emp => emp.contractId === showContractDrawer);
          const contractPlans = calendarPlans.filter(plan => plan.contractId === showContractDrawer);
          const progress = getContractProgress(showContractDrawer);
          
          return (
            <div className="flex flex-col h-full">
              {/* Вкладки */}
              <div className="border-b border-gray-200 dark:border-gray-800 px-6">
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveTab('contingent')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'contingent'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Контингент
                      {progress.contingent && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {contractContingent.length > 0 && (
                        <span className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                          {contractContingent.length}
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('plan')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'plan'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Календарный план
                      {progress.approved && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {contractPlans.length > 0 && (
                        <span className="px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                          {contractPlans.length}
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('route')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'route'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                    disabled={!progress.approved}
                  >
                    <div className="flex items-center gap-2">
                      <Route className="h-4 w-4" />
                      Маршрутные листы
                    </div>
                  </button>
                </div>
              </div>

              {/* Содержимое вкладок */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Вкладка Контингент */}
                {activeTab === 'contingent' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">Контингент договора</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {contractContingent.length} сотрудников
                      </p>
                    </div>

                    {contractContingent.length === 0 ? (
                      <Card>
                        <div className="text-center py-12">
                          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Контингент не загружен</h3>
                          <p className="text-gray-600 dark:text-gray-400">
                            Клиника еще не загрузила список сотрудников
                          </p>
                        </div>
                      </Card>
                    ) : (
                      <Card>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                              <tr>
                                <th className="px-3 py-2 text-left">ФИО</th>
                                <th className="px-3 py-2 text-left">Должность</th>
                                <th className="px-3 py-2 text-left">Объект/участок</th>
                                <th className="px-3 py-2 text-left">Вредные факторы</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {contractContingent.map((emp) => (
                                <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                  <td className="px-3 py-2 font-medium">{emp.name}</td>
                                  <td className="px-3 py-2">{emp.position}</td>
                                  <td className="px-3 py-2">{emp.department}</td>
                                  <td className="px-3 py-2">
                                    <div className="flex flex-wrap gap-1">
                                      {emp.harmfulFactors?.slice(0, 2).map((factor, idx) => (
                                        <span key={idx} className="px-1.5 py-0.5 text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded">
                                          {factor}
                                        </span>
                                      ))}
                                      {emp.harmfulFactors && emp.harmfulFactors.length > 2 && (
                                        <span className="text-xs text-gray-500">+{emp.harmfulFactors.length - 2}</span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    )}
                  </div>
                )}

                {/* Вкладка Календарный план */}
                {activeTab === 'plan' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">Календарные планы</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {contractPlans.length} планов
                      </p>
                    </div>

                    {contractPlans.length === 0 ? (
                      <Card>
                        <div className="text-center py-12">
                          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Планы не созданы</h3>
                          <p className="text-gray-600 dark:text-gray-400">
                            Клиника еще не создала календарный план для этого договора
                          </p>
                        </div>
                      </Card>
                    ) : (
                      <Card>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                              <tr>
                                <th className="px-4 py-3 text-left">Объект/участок</th>
                                <th className="px-4 py-3 text-left">Период</th>
                                <th className="px-4 py-3 text-left">Сотрудников</th>
                                <th className="px-4 py-3 text-left">Участков</th>
                                <th className="px-4 py-3 text-left">Статус</th>
                                <th className="px-4 py-3 text-right">Действия</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {contractPlans.map((plan) => (
                                <>
                                  <tr key={plan.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <td className="px-4 py-3 font-medium">{plan.department}</td>
                                    <td className="px-4 py-3">
                                      {new Date(plan.startDate).toLocaleDateString('ru-RU')} - {new Date(plan.endDate).toLocaleDateString('ru-RU')}
                                    </td>
                                    <td className="px-4 py-3">{plan.employeeIds.length}</td>
                                    <td className="px-4 py-3">{plan.departmentsInfo?.length || 1}</td>
                                    <td className="px-4 py-3">
                                      <span className={`px-2 py-1 text-xs rounded ${getPlanStatusColor(plan.status)}`}>
                                        {getPlanStatusLabel(plan.status)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      {plan.status === 'pending_employer' && (
                                        <Button
                                          size="sm"
                                          onClick={async () => {
                                            try {
                                              await workflowStoreAPI.updateCalendarPlanStatus(plan.id, 'approved');
                                              const updatedPlans = await workflowStoreAPI.getCalendarPlans();
                                              setCalendarPlans(updatedPlans);
                                              showToast('План успешно утвержден', 'success');
                                            } catch (error: any) {
                                              showToast(error.message || 'Ошибка утверждения плана', 'error');
                                            }
                                          }}
                                        >
                                          <CheckCircle className="h-4 w-4 mr-1" />
                                          Утвердить
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                                      >
                                        <Eye className="h-4 w-4 mr-1" />
                                        {expandedPlan === plan.id ? 'Скрыть' : 'Детали'}
                                      </Button>
                                    </td>
                                  </tr>
                                  {expandedPlan === plan.id && (
                                    <tr key={`${plan.id}-expanded`}>
                                      <td colSpan={6} className="px-4 py-4 bg-gray-50 dark:bg-gray-800">
                                        {plan.departmentsInfo && plan.departmentsInfo.length > 0 ? (
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                              Участки и даты
                                            </label>
                                            <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                              {plan.departmentsInfo.map((dept: any, idx: number) => {
                                                const startDateObj = dept.startDate ? new Date(dept.startDate) : null;
                                                const endDateObj = dept.endDate ? new Date(dept.endDate) : null;
                                                const isValidStartDate = startDateObj && !isNaN(startDateObj.getTime());
                                                const isValidEndDate = endDateObj && !isNaN(endDateObj.getTime());
                                                const employeeIds = dept.employeeIds || [];
                                                
                                                return (
                                                  <div key={idx} className="p-2 bg-white dark:bg-gray-900 rounded">
                                                    <p className="font-medium text-sm">{dept.department}</p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                      {isValidStartDate && isValidEndDate
                                                        ? `${startDateObj.toLocaleDateString('ru-RU')} - ${endDateObj.toLocaleDateString('ru-RU')}`
                                                        : dept.startDate && dept.endDate
                                                        ? `${dept.startDate} - ${dept.endDate}`
                                                        : 'Даты не указаны'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-500">
                                                      Сотрудников: {Array.isArray(employeeIds) ? employeeIds.length : 0}
                                                    </p>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        ) : (
                                          <p className="text-sm text-gray-500 dark:text-gray-400">Нет информации об участках</p>
                                        )}
                                      </td>
                                    </tr>
                                  )}
                                </>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    )}
                  </div>
                )}

                {/* Вкладка Маршрутные листы */}
                {activeTab === 'route' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Маршрутные листы</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {routeSheets.length} листов
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          placeholder="Поиск по ФИО, ИИН..."
                          value={routeSheetSearch}
                          onChange={(e) => setRouteSheetSearch(e.target.value)}
                          className="w-64"
                        />
                        <Input
                          type="date"
                          value={routeSheetDateFilter}
                          onChange={(e) => setRouteSheetDateFilter(e.target.value)}
                          className="w-auto"
                        />
                        {(routeSheetSearch || routeSheetDateFilter) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRouteSheetSearch('');
                              setRouteSheetDateFilter('');
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {!progress.approved ? (
                      <Card>
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            Маршрутные листы создаются автоматически после утверждения календарного плана
                          </p>
                        </div>
                      </Card>
                    ) : routeSheets.length === 0 ? (
                      <Card>
                        <div className="text-center py-12">
                          <Route className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Маршрутные листы не найдены</h3>
                          <p className="text-gray-600 dark:text-gray-400">
                            Маршрутные листы будут созданы автоматически после утверждения плана
                          </p>
                        </div>
                      </Card>
                    ) : (
                      <Card>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                              <tr>
                                <th className="px-4 py-3 text-left">Пациент</th>
                                <th className="px-4 py-3 text-left">ИИН</th>
                                <th className="px-4 py-3 text-left">Должность</th>
                                <th className="px-4 py-3 text-left">Дата визита</th>
                                <th className="px-4 py-3 text-left">Прогресс</th>
                                <th className="px-4 py-3 text-left">Статус</th>
                                <th className="px-4 py-3 text-right">Действия</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {routeSheets
                                .filter(rs => {
                                  const matchesSearch = !routeSheetSearch || 
                                    rs.patientName?.toLowerCase().includes(routeSheetSearch.toLowerCase()) ||
                                    rs.iin?.includes(routeSheetSearch);
                                  const matchesDate = !routeSheetDateFilter || rs.visitDate === routeSheetDateFilter;
                                  return matchesSearch && matchesDate;
                                })
                                .map((rs) => {
                                  const completed = rs.services?.filter((s: any) => s.status === 'completed').length || 0;
                                  const total = rs.services?.length || 0;
                                  const isCompleted = total > 0 && completed === total;
                                  return (
                                    <>
                                      <tr key={rs.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <td className="px-4 py-3 font-medium">{rs.patientName}</td>
                                        <td className="px-4 py-3">{rs.iin || '-'}</td>
                                        <td className="px-4 py-3">{rs.position}</td>
                                        <td className="px-4 py-3">
                                          {rs.visitDate ? new Date(rs.visitDate).toLocaleDateString('ru-RU') : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                          <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 min-w-[100px]">
                                              <div 
                                                className={`h-2 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                                                style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
                                              />
                                            </div>
                                            <span className="text-xs text-gray-500">{completed}/{total}</span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className={`px-2 py-1 text-xs rounded ${
                                            isCompleted 
                                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                              : completed > 0
                                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                          }`}>
                                            {isCompleted ? 'Завершен' : completed > 0 ? 'В процессе' : 'Не начат'}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setExpandedRouteSheet(expandedRouteSheet === rs.id ? null : rs.id)}
                                          >
                                            <Eye className="h-4 w-4 mr-1" />
                                            {expandedRouteSheet === rs.id ? 'Скрыть' : 'Детали'}
                                          </Button>
                                        </td>
                                      </tr>
                                      {expandedRouteSheet === rs.id && (
                                        <tr key={`${rs.id}-expanded`}>
                                          <td colSpan={7} className="px-4 py-4 bg-gray-50 dark:bg-gray-800">
                                            <div className="space-y-3">
                                              <h4 className="font-semibold mb-2">Услуги:</h4>
                                              <div className="grid grid-cols-2 gap-2">
                                                {rs.services?.map((service: any) => (
                                                  <div key={service.id} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded border">
                                                    <div className={`w-3 h-3 rounded-full ${service.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                    <span className="text-sm">{service.name}</span>
                                                    {service.cabinet && (
                                                      <span className="text-xs text-gray-500">({service.cabinet})</span>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Drawer>
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
