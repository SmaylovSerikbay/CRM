'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { FileText, Plus, CheckCircle, Clock, Send, X, Search, Building2, Edit, History, XCircle, RefreshCw, Calendar, DollarSign, Users, Upload, Route, Download } from 'lucide-react';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { workflowStoreAPI, ContingentEmployee, CalendarPlan } from '@/lib/store/workflow-store-api';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';

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
  history?: ContractHistoryItem[];
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

export default function ContractsPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchingBin, setSearchingBin] = useState(false);
  const [foundEmployer, setFoundEmployer] = useState<any>(null);
  const [binSearched, setBinSearched] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [contractHistory, setContractHistory] = useState<ContractHistoryItem[]>([]);
  // Данные для быстрых действий
  const [contingent, setContingent] = useState<ContingentEmployee[]>([]);
  const [calendarPlans, setCalendarPlans] = useState<CalendarPlan[]>([]);
  const [showUploadModal, setShowUploadModal] = useState<string | null>(null);
  const [selectedContractForUpload, setSelectedContractForUpload] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  // Временные состояния для фильтров (до применения)
  const [tempSearchQuery, setTempSearchQuery] = useState('');
  const [tempStatusFilter, setTempStatusFilter] = useState<string>('all');
  const [tempDateFromFilter, setTempDateFromFilter] = useState('');
  const [tempDateToFilter, setTempDateToFilter] = useState('');
  
  // Примененные фильтры (используются для фильтрации)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  const [formData, setFormData] = useState({
    employer_bin: '',
    employer_phone: '',
    contract_number: '',
    contract_date: '',
    amount: '',
    people_count: '',
    execution_date: '',
    notes: '',
  });

  useEffect(() => {
    loadContracts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFromFilter, dateToFilter]);

  const loadContracts = async () => {
    try {
      const data: any[] = await workflowStoreAPI.getContracts();
      // Маппим данные из API в наш интерфейс
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
        history: c.history,
      }));
      setContracts(mappedContracts);
      
      // Загружаем контингент и календарные планы для проверки
      try {
        const contingentData = await workflowStoreAPI.getContingent();
        setContingent(contingentData);
        
        const plansData = await workflowStoreAPI.getCalendarPlans();
        setCalendarPlans(plansData);
      } catch (error) {
        console.error('Error loading contingent/plans:', error);
      }
    } catch (error) {
      console.error('Error loading contracts:', error);
      showToast('Ошибка загрузки договоров', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchBin = async (bin: string) => {
    if (!bin.trim() || bin.length < 12) {
      setFoundEmployer(null);
      setBinSearched(false);
      return;
    }

    setSearchingBin(true);
    setBinSearched(false);
    try {
      const result = await workflowStoreAPI.findEmployerByBin(bin);
      setBinSearched(true);
      if (result.found) {
        setFoundEmployer(result.user);
        if (result.user.phone) {
          setFormData({ ...formData, employer_phone: result.user.phone });
        }
      } else {
        setFoundEmployer(null);
      }
    } catch (error: any) {
      console.error('Ошибка поиска БИН:', error);
      setFoundEmployer(null);
      setBinSearched(true);
    } finally {
      setSearchingBin(false);
    }
  };

  // Дебаунс для динамического поиска
  useEffect(() => {
    if (formData.employer_bin.length === 12) {
      const timer = setTimeout(() => {
        handleSearchBin(formData.employer_bin);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setFoundEmployer(null);
      setBinSearched(false);
    }
  }, [formData.employer_bin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employer_bin || !formData.employer_phone || !formData.contract_number) {
      showToast('Заполните все обязательные поля', 'warning');
      return;
    }

    try {
      await workflowStoreAPI.createContract({
        employer_bin: formData.employer_bin,
        employer_phone: formData.employer_phone,
        contract_number: formData.contract_number,
        contract_date: formData.contract_date,
        amount: parseFloat(formData.amount),
        people_count: parseInt(formData.people_count),
        execution_date: formData.execution_date,
        notes: formData.notes,
      });

      showToast('Договор создан и уведомление отправлено работодателю!', 'success');
      setFormData({
        employer_bin: '',
        employer_phone: '',
        contract_number: '',
        contract_date: '',
        amount: '',
        people_count: '',
        execution_date: '',
        notes: '',
      });
      setShowForm(false);
      setFoundEmployer(null);
      loadContracts();
    } catch (error: any) {
      showToast(error.message || 'Ошибка создания договора', 'error');
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Черновик',
      pending_approval: 'Ожидает согласования',
      approved: 'Согласован',
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
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      executed: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleEdit = (contract: Contract) => {
    setEditingContract(contract);
    setFormData({
      employer_bin: contract.employer_bin || '',
      employer_phone: contract.employer_phone || '',
      contract_number: contract.contract_number,
      contract_date: contract.contract_date,
      amount: contract.amount.toString(),
      people_count: contract.people_count.toString(),
      execution_date: contract.execution_date,
      notes: contract.notes || '',
    });
    setShowForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingContract) return;

    try {
      await workflowStoreAPI.updateContract(editingContract.id, {
        contract_number: formData.contract_number,
        contract_date: formData.contract_date,
        amount: parseFloat(formData.amount),
        people_count: parseInt(formData.people_count),
        execution_date: formData.execution_date,
        notes: formData.notes,
      });

      showToast('Договор обновлен!', 'success');
      setFormData({
        employer_bin: '',
        employer_phone: '',
        contract_number: '',
        contract_date: '',
        amount: '',
        people_count: '',
        execution_date: '',
        notes: '',
      });
      setShowForm(false);
      setEditingContract(null);
      loadContracts();
    } catch (error: any) {
      showToast(error.message || 'Ошибка обновления договора', 'error');
    }
  };

  const [resendComment, setResendComment] = useState('');
  const [showResendForm, setShowResendForm] = useState<string | null>(null);

  const handleResendForApproval = async (contractId: string) => {
    try {
      await workflowStoreAPI.resendContractForApproval(contractId, resendComment || undefined);
      showToast('Договор отправлен на согласование!', 'success');
      setResendComment('');
      setShowResendForm(null);
      loadContracts();
    } catch (error: any) {
      showToast(error.message || 'Ошибка отправки договора', 'error');
    }
  };

  const handleShowHistory = async (contractId: string) => {
    if (showHistory === contractId) {
      // Закрываем если уже открыта
      setShowHistory(null);
      return;
    }
    
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

  // Фильтрация контрактов
  const filteredContracts = contracts.filter((contract) => {
    // Поиск по тексту
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      contract.contract_number.toLowerCase().includes(searchLower) ||
      contract.employer_bin?.toLowerCase().includes(searchLower) ||
      contract.employer_name?.toLowerCase().includes(searchLower) ||
      contract.notes?.toLowerCase().includes(searchLower);

    // Фильтр по статусу
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;

    // Фильтр по диапазону дат
    let matchesDate = true;
    if (dateFromFilter || dateToFilter) {
      const contractDate = new Date(contract.createdAt);
      contractDate.setHours(0, 0, 0, 0);
      
      if (dateFromFilter) {
        const fromDate = new Date(dateFromFilter);
        fromDate.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && contractDate >= fromDate;
      }
      
      if (dateToFilter) {
        const toDate = new Date(dateToFilter);
        toDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && contractDate <= toDate;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Пагинация
  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedContracts = filteredContracts.slice(startIndex, endIndex);

  const applyFilters = () => {
    setSearchQuery(tempSearchQuery);
    setStatusFilter(tempStatusFilter);
    setDateFromFilter(tempDateFromFilter);
    setDateToFilter(tempDateToFilter);
  };

  const resetFilters = () => {
    setTempSearchQuery('');
    setTempStatusFilter('all');
    setTempDateFromFilter('');
    setTempDateToFilter('');
    setSearchQuery('');
    setStatusFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
  };

  const hasUnappliedFilters = 
    tempSearchQuery !== searchQuery ||
    tempStatusFilter !== statusFilter ||
    tempDateFromFilter !== dateFromFilter ||
    tempDateToFilter !== dateToFilter;

  // Проверка наличия контингента для договора
  const getContingentCount = (contractId: string): number => {
    return contingent.filter(emp => emp.contractId === contractId).length;
  };

  // Проверка наличия календарных планов для договора
  const getCalendarPlansCount = (contractId: string): number => {
    return calendarPlans.filter(plan => plan.contractId === contractId).length;
  };

  // Проверка наличия утвержденного календарного плана
  const hasApprovedPlan = (contractId: string): boolean => {
    return calendarPlans.some(plan => 
      plan.contractId === contractId && 
      (plan.status === 'approved' || plan.status === 'sent_to_ses')
    );
  };

  // Обработчик загрузки контингента
  const handleUploadContingent = (contractId: string) => {
    setSelectedContractForUpload(contractId);
    setShowUploadModal(contractId);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, contractId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const result = await workflowStoreAPI.uploadExcelContingent(file, contractId);
      const updated = await workflowStoreAPI.getContingent();
      setContingent(updated);
      
      if (result.skipped > 0) {
        const reasons = result.skipped_reasons || {};
        const reasonsText = [
          reasons.duplicate ? `дубликаты: ${reasons.duplicate}` : '',
          reasons.no_name ? `нет ФИО: ${reasons.no_name}` : '',
        ].filter(Boolean).join(', ');
        showToast(`Загружено: ${result.created}, пропущено (${reasonsText || 'разные причины'}): ${result.skipped}`, 'info');
      } else {
        showToast('Файл успешно загружен!', 'success');
      }
      
      setShowUploadModal(null);
      setSelectedContractForUpload('');
    } catch (error: any) {
      showToast(error.message || 'Ошибка загрузки файла', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Обработчик создания календарного плана
  const handleCreateCalendarPlan = (contractId: string) => {
    router.push(`/dashboard/clinic/calendar-plan?contractId=${contractId}`);
  };

  // Обработчик создания маршрутного листа
  const handleCreateRouteSheet = (contractId: string) => {
    router.push(`/dashboard/clinic/route-sheet?contractId=${contractId}`);
  };

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
            <div>
              <h1 className="text-2xl font-bold">Договоры</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Управление договорами с работодателями
              </p>
            </div>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать договор
            </Button>
          </div>
          {/* Панель поиска и фильтров */}
          <Card className="mb-4">
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Поиск */}
              <div className="md:col-span-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    value={tempSearchQuery}
                    onChange={(e) => setTempSearchQuery(e.target.value)}
                    placeholder="Поиск по номеру, БИН, названию..."
                    className="pl-10"
                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                  />
                </div>
              </div>

              {/* Фильтр по статусу */}
              <div className="md:col-span-2">
                <select
                  value={tempStatusFilter}
                  onChange={(e) => setTempStatusFilter(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
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

              {/* Фильтр по дате от */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                  <Input
                    type="date"
                    value={tempDateFromFilter}
                    onChange={(e) => setTempDateFromFilter(e.target.value)}
                    className="w-full pl-10"
                    title="Дата от"
                  />
                </div>
              </div>

              {/* Фильтр по дате до */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                  <Input
                    type="date"
                    value={tempDateToFilter}
                    onChange={(e) => setTempDateToFilter(e.target.value)}
                    className="w-full pl-10"
                    title="Дата до"
                  />
                </div>
              </div>

              {/* Кнопка применить */}
              <div className="md:col-span-1">
                <Button
                  onClick={applyFilters}
                  className="w-full h-full"
                  title="Применить фильтры"
                  disabled={!hasUnappliedFilters}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {/* Кнопка сброса */}
              <div className="md:col-span-1">
                {(searchQuery || statusFilter !== 'all' || dateFromFilter || dateToFilter) && (
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="w-full h-full"
                    title="Сбросить фильтры"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

              {/* Счетчик результатов и пагинация */}
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                  <span>
                    Показано {startIndex + 1}-{Math.min(endIndex, filteredContracts.length)} из {filteredContracts.length} ({contracts.length} всего)
                  </span>
                  {(searchQuery || statusFilter !== 'all' || dateFromFilter || dateToFilter) && (
                    <span className="text-blue-600 dark:text-blue-400">
                      Фильтры активны
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs">На странице:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-4">
        {/* Модальное окно создания/редактирования договора */}
        <Modal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setFoundEmployer(null);
            setBinSearched(false);
            setEditingContract(null);
            setFormData({
              employer_bin: '',
              employer_phone: '',
              contract_number: '',
              contract_date: '',
              amount: '',
              people_count: '',
              execution_date: '',
              notes: '',
            });
          }}
          title={editingContract ? 'Редактировать договор' : 'Создать договор'}
          size="xl"
        >
              <form onSubmit={editingContract ? handleUpdate : handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {!editingContract && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          БИН организации работодателя *
                        </label>
                        <div className="relative">
                          <Input
                            value={formData.employer_bin}
                            onChange={(e) => {
                              // Разрешаем только цифры и ограничиваем до 12 символов
                              const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                              setFormData({ ...formData, employer_bin: value });
                            }}
                            maxLength={12}
                            placeholder="123456789012"
                            required
                            className={`pr-10 ${
                              binSearched && !foundEmployer && formData.employer_bin.length === 12
                                ? 'border-red-500 dark:border-red-500'
                                : foundEmployer
                                ? 'border-green-500 dark:border-green-500'
                                : ''
                            }`}
                          />
                          {searchingBin && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900 dark:border-white"></div>
                            </div>
                          )}
                          {!searchingBin && foundEmployer && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                          )}
                          {!searchingBin && binSearched && !foundEmployer && formData.employer_bin.length === 12 && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                          )}
                        </div>
                        {searchingBin && (
                          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                            <Search className="h-3 w-3 animate-pulse" />
                            Поиск организации...
                          </p>
                        )}
                        {foundEmployer && (
                          <p className="text-sm text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Найдена организация: {foundEmployer.registration_data?.name || 'Не указано'}
                          </p>
                        )}
                        {binSearched && !foundEmployer && formData.employer_bin.length === 12 && (
                          <p className="text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            Данная организация не зарегистрирована в системе. Договор будет создан, и работодатель получит уведомление для регистрации.
                          </p>
                        )}
                      </div>
                      <PhoneInput
                        label="Телефон работодателя"
                        value={formData.employer_phone}
                        onChange={(value) => setFormData({ ...formData, employer_phone: value })}
                        required
                      />
                    </>
                  )}
                  <Input
                    label="Номер договора *"
                    value={formData.contract_number}
                    onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
                    required
                  />
                  <Input
                    label="Дата договора *"
                    type="date"
                    value={formData.contract_date}
                    onChange={(e) => setFormData({ ...formData, contract_date: e.target.value })}
                    required
                  />
                  <Input
                    label="Сумма договора (тенге) *"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                  <Input
                    label="Количество людей *"
                    type="number"
                    value={formData.people_count}
                    onChange={(e) => setFormData({ ...formData, people_count: e.target.value })}
                    required
                  />
                  <Input
                    label="Дата исполнения договора *"
                    type="date"
                    value={formData.execution_date}
                    onChange={(e) => setFormData({ ...formData, execution_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Примечания
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                    rows={3}
                  />
                </div>
                <div className="flex gap-4 pt-2">
                  <Button type="submit" className="flex-1">
                    {editingContract ? 'Сохранить изменения' : 'Создать и отправить'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { 
                    setShowForm(false); 
                    setFoundEmployer(null); 
                    setBinSearched(false);
                    setEditingContract(null);
                    setFormData({
                      employer_bin: '',
                      employer_phone: '',
                      contract_number: '',
                      contract_date: '',
                      amount: '',
                      people_count: '',
                      execution_date: '',
                      notes: '',
                    });
                  }}>
                    Отмена
                  </Button>
                </div>
              </form>
        </Modal>

        {/* Модальное окно загрузки контингента */}
        <Modal
          isOpen={showUploadModal !== null}
          onClose={() => {
            setShowUploadModal(null);
            setSelectedContractForUpload('');
          }}
          title="Загрузка списка контингента"
          size="xl"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Загрузите Excel-файл со списком сотрудников. Система автоматически присвоит вредные факторы.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await workflowStoreAPI.downloadContingentTemplate();
                  } catch (error: any) {
                    showToast(error.message || 'Ошибка скачивания шаблона', 'error');
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Скачать шаблон
              </Button>
            </div>

            {showUploadModal && (
              <>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Контингент будет загружен для договора: <strong>№{contracts.find(c => c.id === showUploadModal)?.contract_number}</strong>
                  </p>
                </div>

                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <label className="cursor-pointer">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Выберите Excel-файл или перетащите сюда
                    </span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => handleFileUpload(e, showUploadModal)}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Поддерживаются файлы .xlsx, .xls. Формат согласно приказу №131: № п/п, ФИО, Дата рождения, Пол, Объект или участок, Занимаемая должность, Общий стаж, Стаж по занимаемой должности, Дата последнего медосмотра, Профессиональная вредность, Примечание
                  </p>
                  {isUploading && (
                    <div className="mt-4">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Обработка файла...</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </Modal>

        <div>
          {filteredContracts.length === 0 && contracts.length > 0 ? (
            <Card>
              <div className="text-center py-12">
                <Search className="h-16 w-16 text-gray-400 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Ничего не найдено</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Попробуйте изменить параметры поиска или фильтры
                </p>
                <Button variant="outline" onClick={resetFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Сбросить фильтры
                </Button>
              </div>
            </Card>
          ) : contracts.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Нет договоров</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Создайте первый договор с работодателем
                </p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать договор
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
                        Номер договора
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Работодатель
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        БИН
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
                    {paginatedContracts.map((contract, index) => {
                      const isExpanded = editingContract?.id === contract.id || showHistory === contract.id || showResendForm === contract.id;
                      
                      return (
                        <>
                          <motion.tr
                            key={contract.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.02 }}
                            className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                              showHistory === contract.id 
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400' 
                                : isExpanded ? 'bg-gray-50 dark:bg-gray-800/30' : ''
                            }`}
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                №{contract.contract_number}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                                {contract.employer_name || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm text-gray-900 dark:text-white">
                                {contract.employer_bin || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm text-gray-900 dark:text-white">
                                {contract.contract_date}
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
                                {contract.execution_date}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusColor(contract.status)}`}>
                        {getStatusLabel(contract.status)}
                      </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2 flex-wrap">
                      {(contract.status === 'draft' || contract.status === 'rejected') && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(contract)}
                          >
                                      <Edit className="h-4 w-4 mr-1" />
                            Редактировать
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setShowResendForm(contract.id)}
                          >
                                      <Send className="h-4 w-4 mr-1" />
                                      {contract.status === 'rejected' ? 'Повторно' : 'Отправить'}
                          </Button>
                        </>
                      )}
                      {/* Кнопки для утвержденных и исполненных договоров */}
                      {(contract.status === 'approved' || contract.status === 'executed') && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUploadContingent(contract.id)}
                            title="Загрузить контингент"
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Контингент
                            {getContingentCount(contract.id) > 0 && (
                              <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                                {getContingentCount(contract.id)}
                              </span>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCreateCalendarPlan(contract.id)}
                            disabled={getContingentCount(contract.id) === 0}
                            title={getContingentCount(contract.id) === 0 ? 'Сначала загрузите контингент' : 'Создать календарный план'}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            План
                            {getCalendarPlansCount(contract.id) > 0 && (
                              <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                                {getCalendarPlansCount(contract.id)}
                              </span>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCreateRouteSheet(contract.id)}
                            disabled={!hasApprovedPlan(contract.id)}
                            title={!hasApprovedPlan(contract.id) ? 'Сначала создайте и утвердите календарный план' : 'Создать маршрутный лист'}
                          >
                            <Route className="h-4 w-4 mr-1" />
                            Маршрут
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShowHistory(contract.id)}
                      >
                                  <History className="h-4 w-4 mr-1" />
                                  {showHistory === contract.id ? 'Скрыть' : 'История'}
                      </Button>
                    </div>
                            </td>
                          </motion.tr>

                          {/* Форма повторной отправки */}
                    {showResendForm === contract.id && (
                            <tr>
                              <td colSpan={9} className="px-4 py-3 bg-gray-50 dark:bg-gray-800/30">
                                <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                                    <Card className="p-4 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10">
                                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                                        {contract.status === 'rejected' ? 'Повторная отправка на согласование' : 'Отправка на согласование'}
                                      </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Комментарий (необязательно)
                            </label>
                            <textarea
                              value={resendComment}
                              onChange={(e) => setResendComment(e.target.value)}
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
                              rows={3}
                              placeholder="Добавьте комментарий к договору..."
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleResendForApproval(contract.id)}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Отправить
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowResendForm(null);
                                setResendComment('');
                              }}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Отмена
                            </Button>
                          </div>
                        </div>
                                    </Card>
                      </motion.div>
                                </AnimatePresence>
                              </td>
                            </tr>
                    )}

                          {/* История */}
                    {showHistory === contract.id && (
                            <tr className="bg-blue-50/30 dark:bg-blue-900/10">
                              <td colSpan={9} className="px-0 py-0">
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
                                          <History className="h-3.5 w-3.5 text-white" />
                        </div>
                                        <span>История изменений договора №{contract.contract_number} ({contractHistory.length})</span>
                                      </h4>
                                      
                                      {/* Подтаблица истории */}
                                      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm max-h-96 overflow-y-auto">
                          {contractHistory.length === 0 ? (
                                          <div className="p-8 text-center">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                              Нет записей в истории
                                            </p>
                                          </div>
                                        ) : (
                                          <table className="w-full text-sm">
                                            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-700 z-10">
                                              <tr>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                                                  Дата
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                                                  Действие
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                                                  Статус
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                                                  Пользователь
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                                                  Комментарий
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                                                  Изменения
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                              {contractHistory.map((item, idx) => (
                                                <motion.tr
                                                  key={item.id}
                                                  initial={{ opacity: 0, x: -10 }}
                                                  animate={{ opacity: 1, x: 0 }}
                                                  transition={{ delay: idx * 0.05 }}
                                                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                                >
                                                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                                    {new Date(item.created_at).toLocaleString('ru-RU', { 
                                                      day: '2-digit', 
                                                      month: '2-digit', 
                                                      year: 'numeric',
                                                      hour: '2-digit',
                                                      minute: '2-digit'
                                                    })}
                                                  </td>
                                                  <td className="px-4 py-3">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                      {getActionLabel(item.action)}
                                                    </span>
                                                  </td>
                                                  <td className="px-4 py-3">
                                      {item.new_status && (
                                                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.new_status)}`}>
                                          {getStatusLabel(item.new_status)}
                                        </span>
                                      )}
                                                  </td>
                                                  <td className="px-4 py-3">
                                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                                      <div className="font-medium">{item.user_name || 'Система'}</div>
                                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {item.user_role === 'clinic' ? 'Клиника' : 'Работодатель'}
                                    </div>
                                                    </div>
                                                  </td>
                                                  <td className="px-4 py-3">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                                      {item.comment || '—'}
                                                    </span>
                                                  </td>
                                                  <td className="px-4 py-3">
                                                    {item.changes && Object.keys(item.changes).length > 0 ? (
                                                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                                        {Object.entries(item.changes).slice(0, 2).map(([key, value]: [string, any]) => (
                                                          <div key={key}>
                                            {key}: {value.old} → {value.new}
                                      </div>
                                                        ))}
                                                        {Object.keys(item.changes).length > 2 && (
                                                          <div className="text-gray-500">+{Object.keys(item.changes).length - 2} еще</div>
                                    )}
                                  </div>
                                                    ) : (
                                                      <span className="text-sm text-gray-400">—</span>
                                                    )}
                                                  </td>
                                                </motion.tr>
                                              ))}
                                            </tbody>
                                          </table>
                          )}
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

