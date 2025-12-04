'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { FileText, Plus, CheckCircle, Clock, Send, X, Search, Building2, Edit, History, XCircle, RefreshCw } from 'lucide-react';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { workflowStoreAPI } from '@/lib/store/workflow-store-api';
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
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchingBin, setSearchingBin] = useState(false);
  const [foundEmployer, setFoundEmployer] = useState<any>(null);
  const [binSearched, setBinSearched] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [contractHistory, setContractHistory] = useState<ContractHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
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

  const loadContracts = async () => {
    try {
      const data = await workflowStoreAPI.getContracts();
      setContracts(data);
    } catch (error) {
      console.error('Error loading contracts:', error);
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

  const handleResendForApproval = async (contractId: string) => {
    const comment = prompt('Добавьте комментарий (необязательно):');
    
    try {
      await workflowStoreAPI.resendContractForApproval(contractId, comment || undefined);
      showToast('Договор отправлен на согласование!', 'success');
      loadContracts();
    } catch (error: any) {
      showToast(error.message || 'Ошибка отправки договора', 'error');
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

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
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
              <h1 className="text-2xl font-bold">Договоры</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Управление договорами с работодателями
              </p>
            </div>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать договор
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Панель поиска и фильтров */}
        <Card className="mb-6">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Поиск */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по номеру, БИН, названию или примечаниям..."
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Фильтр по статусу */}
              <div className="w-full md:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
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
              <div className="w-full md:w-48">
                <Input
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                  placeholder="Дата от"
                  className="w-full"
                />
              </div>

              {/* Фильтр по дате до */}
              <div className="w-full md:w-48">
                <Input
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                  placeholder="Дата до"
                  className="w-full"
                />
              </div>

              {/* Кнопка сброса */}
              {(searchQuery || statusFilter !== 'all' || dateFromFilter || dateToFilter) && (
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="w-full md:w-auto"
                >
                  <X className="h-4 w-4 mr-2" />
                  Сбросить
                </Button>
              )}
            </div>

            {/* Счетчик результатов */}
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>
                Найдено: {filteredContracts.length} из {contracts.length}
              </span>
              {(searchQuery || statusFilter !== 'all' || dateFromFilter || dateToFilter) && (
                <span className="text-blue-600 dark:text-blue-400">
                  Применены фильтры
                  {dateFromFilter && dateToFilter && (
                    <span className="ml-2">
                      ({new Date(dateFromFilter).toLocaleDateString('ru-RU')} - {new Date(dateToFilter).toLocaleDateString('ru-RU')})
                    </span>
                  )}
                  {dateFromFilter && !dateToFilter && (
                    <span className="ml-2">
                      (с {new Date(dateFromFilter).toLocaleDateString('ru-RU')})
                    </span>
                  )}
                  {!dateFromFilter && dateToFilter && (
                    <span className="ml-2">
                      (до {new Date(dateToFilter).toLocaleDateString('ru-RU')})
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        </Card>

        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card>
              <h2 className="text-xl font-semibold mb-4">
                {editingContract ? 'Редактировать договор' : 'Создать договор'}
              </h2>
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
                <div className="flex gap-4">
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
            </Card>
          </motion.div>
        )}

        <div className="grid gap-6">
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
            filteredContracts.map((contract) => (
              <Card key={contract.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">Договор №{contract.contract_number}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
                        {getStatusLabel(contract.status)}
                      </span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Дата договора</p>
                        <p className="font-medium">{contract.contract_date}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Сумма</p>
                        <p className="font-medium">{contract.amount.toLocaleString()} ₸</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Количество сотрудников</p>
                        <p className="font-medium">{contract.people_count}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Дата исполнения</p>
                        <p className="font-medium">{contract.execution_date}</p>
                      </div>
                      {contract.employer_bin && (
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">БИН работодателя</p>
                          <p className="font-medium">{contract.employer_bin}</p>
                        </div>
                      )}
                      {contract.employer_name && (
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Работодатель</p>
                          <p className="font-medium">{contract.employer_name}</p>
                        </div>
                      )}
                      {contract.notes && (
                        <div className="md:col-span-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Примечания</p>
                          <p className="font-medium">{contract.notes}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      {(contract.status === 'draft' || contract.status === 'rejected') && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(contract)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Редактировать
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleResendForApproval(contract.id)}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {contract.status === 'rejected' ? 'Отправить повторно' : 'Отправить на согласование'}
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShowHistory(contract.id)}
                      >
                        <History className="h-4 w-4 mr-2" />
                        История
                      </Button>
                    </div>

                    {showHistory === contract.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">История изменений</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowHistory(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {contractHistory.length === 0 ? (
                            <p className="text-sm text-gray-500">Нет записей в истории</p>
                          ) : (
                            contractHistory.map((item) => (
                              <div key={item.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-sm">{getActionLabel(item.action)}</span>
                                      {item.new_status && (
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(item.new_status)}`}>
                                          {getStatusLabel(item.new_status)}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {item.user_name || 'Система'} ({item.user_role === 'clinic' ? 'Клиника' : 'Работодатель'})
                                    </p>
                                    {item.comment && (
                                      <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">
                                        {item.comment}
                                      </p>
                                    )}
                                    {item.changes && Object.keys(item.changes).length > 0 && (
                                      <div className="mt-2 text-xs">
                                        <p className="font-medium mb-1">Изменения:</p>
                                        {Object.entries(item.changes).map(([key, value]: [string, any]) => (
                                          <p key={key} className="text-gray-600 dark:text-gray-400">
                                            {key}: {value.old} → {value.new}
                                          </p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                    {new Date(item.created_at).toLocaleString('ru-RU')}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

