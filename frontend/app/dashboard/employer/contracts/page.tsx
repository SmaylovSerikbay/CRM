'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { 
  FileText, CheckCircle, Clock, Send, X, Download, Upload, 
  Search, Filter, Building2, Calendar, Users, DollarSign, ChevronRight, ChevronDown, ChevronLeft,
  AlertCircle, CheckCircle2, XCircle, Hourglass, Ban, FileCheck, Edit, Route
} from 'lucide-react';
import { workflowStoreAPI } from '@/lib/store/workflow-store-api';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

// Список стандартных вредных факторов согласно приказу № ҚР ДСМ-131/2020
// ТОЧНО СООТВЕТСТВУЕТ Excel шаблону из backend/test_template.py
const HARMFUL_FACTORS_OPTIONS = [
  "п.1 «Работы, связанные с воздействием химических факторов»",
  "п.2 «Работы с канцерогенными веществами»",
  "п.3 «Работы с пестицидами и агрохимикатами»",
  "п.4 «Работы, связанные с воздействием биологических факторов»",
  "п.5 «Работы, выполняемые в условиях повышенного шума»",
  "п.6 «Работы, выполняемые в условиях вибрации»",
  "п.7 «Работы, выполняемые в условиях ионизирующего излучения»",
  "п.8 «Работы, выполняемые в условиях неионизирующих излучений»",
  "п.9 «Работы, выполняемые при повышенной или пониженной температуре воздуха»",
  "п.10 «Работы в замкнутых пространствах»",
  "п.11 «Работы на высоте»",
  "п.12 «Работы, связанные с подъемом и перемещением тяжестей»",
  "п.13 «Работы в ночное время»",
  "п.14 «Работа на ПК»",
  "п.15 «Работы, связанные с эмоциональным и умственным перенапряжением»",
  "п.16 «Работы, связанные с повышенной ответственностью»",
  "п.17 «Работы вахтовым методом»",
  "п.18 «Подземные работы»",
  "п.19 «Работы на транспорте»",
  "п.20 «Работы, связанные с воздействием пыли»",
  "п.21 «Работы с горюче-смазочными материалами»",
  "п.22 «Работы, связанные с воздействием нефти и нефтепродуктов»",
  "п.23 «Работы в условиях повышенной загазованности»",
  "п.24 «Работы в условиях недостатка кислорода»",
  "п.25 «Работы в условиях повышенной влажности»",
  "п.26 «Работы, связанные с виброинструментом»",
  "п.27 «Работы на конвейерах»",
  "п.28 «Работы на строительных площадках»",
  "п.29 «Работы в металлургическом производстве»",
  "п.30 «Работы в горнодобывающей промышленности»",
  "п.31 «Работы в деревообрабатывающем производстве»",
  "п.32 «Работы в текстильной и швейной промышленности»",
  "п.33 «Профессии и работы»"
];

interface Contract {
  id: string;
  contract_number: string;
  contract_date: string;
  amount: number;
  people_count: number;
  execution_date: string;
  status:
    | 'draft'
    | 'pending_approval'
    | 'approved'
    | 'active'
    | 'in_progress'
    | 'partially_executed'
    | 'rejected'
    | 'sent'
    | 'executed'
    | 'cancelled';
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
  // Поля для двухэтапного исполнения
  execution_type?: 'full' | 'partial';
  executed_by_clinic_at?: string;
  execution_notes?: string;
  confirmed_by_employer_at?: string;
  employer_rejection_reason?: string;
}

function EmployerContractsContent() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const binFromUrl = searchParams.get('bin');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  // Фильтры и поиск
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Состояния для контингента (идентично клинике)
  const [contingent, setContingent] = useState<any[]>([]);
  const [isLoadingContingent, setIsLoadingContingent] = useState(false);
  const [showContractDrawer, setShowContractDrawer] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'contingent' | 'plan' | 'route'>('contingent');
  
  // Фильтры для контингента (идентично клинике)
  const [contingentNameFilter, setContingentNameFilter] = useState('');
  const [contingentPositionFilter, setContingentPositionFilter] = useState('');
  const [contingentDepartmentFilter, setContingentDepartmentFilter] = useState('');
  const [contingentHarmfulFactorsFilter, setContingentHarmfulFactorsFilter] = useState<string[]>([]);
  const [showContingentFilters, setShowContingentFilters] = useState(false);
  const [showHarmfulFactorsDropdown, setShowHarmfulFactorsDropdown] = useState(false);

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
        // Поля для двухэтапного исполнения
        execution_type: c.execution_type,
        executed_by_clinic_at: c.executed_by_clinic_at,
        execution_notes: c.execution_notes,
        confirmed_by_employer_at: c.confirmed_by_employer_at,
        employer_rejection_reason: c.employer_rejection_reason,
      }));
      setContracts(mappedContracts);
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

  // Функции для работы с контингентом (идентично клинике)
  const loadContingent = async (contractId: string) => {
    try {
      setIsLoadingContingent(true);
      const data = await workflowStoreAPI.getAllContingentByContract(contractId);
      setContingent(data);
    } catch (error) {
      console.error('Error loading contingent:', error);
      showToast('Ошибка загрузки контингента', 'error');
    } finally {
      setIsLoadingContingent(false);
    }
  };

  // Фильтрация контингента (идентично клинике)
  const getFilteredContingent = (contractId: string): any[] => {
    const contractContingent = contingent.filter(emp => emp.contractId === contractId);
    
    return contractContingent.filter(emp => {
      const matchesName = !contingentNameFilter || 
        emp.name.toLowerCase().includes(contingentNameFilter.toLowerCase());
      
      const matchesPosition = !contingentPositionFilter || 
        emp.position.toLowerCase().includes(contingentPositionFilter.toLowerCase());
      
      const matchesDepartment = !contingentDepartmentFilter || 
        emp.department.toLowerCase().includes(contingentDepartmentFilter.toLowerCase());
      
      const matchesHarmfulFactors = contingentHarmfulFactorsFilter.length === 0 || 
        contingentHarmfulFactorsFilter.some(selectedFactor => {
          if (!emp.harmfulFactors || !Array.isArray(emp.harmfulFactors)) {
            return false;
          }
          
          return emp.harmfulFactors.some(empFactor => {
            // Нормализуем строки для сравнения (убираем точки, приводим к нижнему регистру)
            const normalizeString = (str) => str.toLowerCase().replace(/\./g, '').trim();
            const normalizedSelected = normalizeString(selectedFactor);
            const normalizedEmp = normalizeString(empFactor);
            
            // Проверяем различные варианты совпадения
            const exactMatch = empFactor === selectedFactor;
            const normalizedMatch = normalizedEmp === normalizedSelected;
            const partialMatch = normalizedEmp.includes(normalizedSelected) || normalizedSelected.includes(normalizedEmp);
            
            return exactMatch || normalizedMatch || partialMatch;
          });
        });
      
      return matchesName && matchesPosition && matchesDepartment && matchesHarmfulFactors;
    });
  };

  const handleExportContingent = async (contractId: string) => {
    try {
      const filteredData = getFilteredContingent(contractId);
      if (filteredData.length === 0) {
        showToast('Нет данных для экспорта', 'warning');
        return;
      }

      // Импортируем XLSX динамически
      const XLSX = await import('xlsx');
      
      const contingentData = filteredData.map(employee => ({
        'ФИО': employee.name,
        'Должность': employee.position,
        'Объект или участок': employee.department,
        'Телефон': employee.phone || '',
        'Дата рождения': employee.birthDate || '',
        'Пол': employee.gender === 'male' ? 'Мужской' : employee.gender === 'female' ? 'Женский' : '',
        'Профессиональная вредность': employee.harmfulFactors?.join(', ') || '',
        'Требует осмотра': employee.requiresExamination ? 'Да' : 'Нет',
        'Последний осмотр': employee.lastExaminationDate || '',
        'Следующий осмотр': employee.nextExaminationDate || '',
        'Общий стаж': employee.totalExperienceYears || '',
        'Стаж по должности': employee.positionExperienceYears || '',
        'Примечания': employee.notes || ''
      }));

      const ws = XLSX.utils.json_to_sheet(contingentData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Контингент');

      const contract = contracts.find(c => c.id === contractId);
      const fileName = `Контингент_Договор_${contract?.contract_number}_${new Date().toLocaleDateString('ru-RU')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      showToast('Файл успешно загружен', 'success');
    } catch (error: any) {
      console.error('Export error:', error);
      showToast(error.message || 'Ошибка экспорта', 'error');
    }
  };

  // Обработчик перехода к странице договора
  const handleOpenContractPage = (contractId: string) => {
    // Переходим на отдельную страницу договора
    window.location.href = `/dashboard/employer/contracts/${contractId}`;
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
      active: {
        label: 'Действует',
        icon: CheckCircle,
        colors: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
      },
      in_progress: {
        label: 'В процессе исполнения',
        icon: Hourglass,
        colors: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800'
      },
      partially_executed: {
        label: 'Частично исполнен',
        icon: AlertCircle,
        colors: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800'
      },
      rejected: {
        label: 'Отклонен',
        icon: XCircle,
        colors: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
      },
      sent: {
        label: 'Отправлен',
        icon: Send,
        colors: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
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
                          <option value="active">Действует</option>
                          <option value="in_progress">В процессе исполнения</option>
                          <option value="partially_executed">Частично исполнен</option>
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
                    const isExpanded = showRejectForm === contract.id;
                    
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
                              {/* Кнопки подтверждения/отклонения исполнения */}
                              {contract.executed_by_clinic_at && !contract.confirmed_by_employer_at && !contract.employer_rejection_reason && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      if (confirm('Подтвердить исполнение договора?')) {
                                        try {
                                          await workflowStoreAPI.confirmExecutionByEmployer(contract.id);
                                          showToast('Исполнение договора подтверждено', 'success');
                                          loadContracts();
                                        } catch (error: any) {
                                          showToast(error.message || 'Ошибка подтверждения', 'error');
                                        }
                                      }
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Подтвердить исполнение
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const reason = prompt('Укажите причину отклонения исполнения:');
                                      if (reason && reason.trim()) {
                                        workflowStoreAPI.rejectExecutionByEmployer(contract.id, reason)
                                          .then(() => {
                                            showToast('Исполнение отклонено', 'success');
                                            loadContracts();
                                          })
                                          .catch((error: any) => {
                                            showToast(error.message || 'Ошибка отклонения', 'error');
                                          });
                                      }
                                    }}
                                    className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Отклонить исполнение
                                  </Button>
                                </>
                              )}
                              {/* Индикатор подтверждения исполнения */}
                              {contract.confirmed_by_employer_at && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  <span className="text-xs text-green-700 dark:text-green-300">
                                    Исполнение подтверждено
                                  </span>
                                </div>
                              )}
                              {/* Индикатор отклонения исполнения */}
                              {contract.employer_rejection_reason && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                  <span className="text-xs text-red-700 dark:text-red-300">
                                    Исполнение отклонено
                                  </span>
                                </div>
                              )}
                              {/* Кнопка для утвержденных и исполненных договоров */}
                              {(contract.status === 'approved' || contract.status === 'executed') && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setShowContractDrawer(contract.id);
                                      setActiveTab('contingent');
                                      loadContingent(contract.id);
                                    }}
                                    title="Просмотр контингента"
                                  >
                                    <Users className="h-4 w-4 mr-2" />
                                    Контингент
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenContractPage(contract.id)}
                                    title="Управление договором"
                                  >
                                    <FileCheck className="h-4 w-4 mr-2" />
                                    Документы
                                  </Button>
                                </>
                              )}
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

      {/* Модальное окно контингента (идентично клинике) */}
      <AnimatePresence>
        {showContractDrawer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowContractDrawer(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Заголовок модального окна */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Договор №{contracts.find(c => c.id === showContractDrawer)?.contract_number}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {contracts.find(c => c.id === showContractDrawer)?.clinic_name}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowContractDrawer(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Вкладки */}
              <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex">
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
                      {contingent.filter(emp => emp.contractId === showContractDrawer).length > 0 && (
                        <span className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                          {contingent.filter(emp => emp.contractId === showContractDrawer).length}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Содержимое вкладок */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Вкладка Контингент */}
                {activeTab === 'contingent' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Контингент договора</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {contingent.filter(emp => emp.contractId === showContractDrawer).length} сотрудников
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline"
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
                        {contingent.filter(emp => emp.contractId === showContractDrawer).length > 0 && (
                          <Button 
                            onClick={() => handleExportContingent(showContractDrawer)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Экспорт контингента
                          </Button>
                        )}
                      </div>
                    </div>

                    {contingent.filter(emp => emp.contractId === showContractDrawer).length === 0 ? (
                      <Card>
                        <div className="text-center py-12">
                          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Контингент не загружен</h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Клиника еще не загрузила список сотрудников для этого договора
                          </p>
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                  Хотите предоставить шаблон клинике?
                                </p>
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                  Скачайте стандартный шаблон Excel для передачи клинике
                                </p>
                              </div>
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
                          </div>
                        </div>
                      </Card>
                    ) : (
                      <>
                        {/* Фильтры для контингента (идентично клинике) */}
                        <Card className="mb-4">
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium">Фильтры контингента</h4>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowContingentFilters(!showContingentFilters)}
                              >
                                <Filter className="h-4 w-4 mr-2" />
                                {showContingentFilters ? 'Скрыть' : 'Показать'} фильтры
                              </Button>
                            </div>
                            
                            {showContingentFilters && (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                <Input
                                  placeholder="Поиск по ФИО"
                                  value={contingentNameFilter}
                                  onChange={(e) => setContingentNameFilter(e.target.value)}
                                />
                                <Input
                                  placeholder="Поиск по должности"
                                  value={contingentPositionFilter}
                                  onChange={(e) => setContingentPositionFilter(e.target.value)}
                                />
                                <Input
                                  placeholder="Поиск по участку"
                                  value={contingentDepartmentFilter}
                                  onChange={(e) => setContingentDepartmentFilter(e.target.value)}
                                />
                                <div className="relative harmful-factors-dropdown">
                                  <Button
                                    variant="outline"
                                    onClick={() => setShowHarmfulFactorsDropdown(!showHarmfulFactorsDropdown)}
                                    className="w-full justify-between text-left"
                                  >
                                    <span className="truncate">
                                      {contingentHarmfulFactorsFilter.length === 0 
                                        ? 'Выберите вредные факторы' 
                                        : `Выбрано: ${contingentHarmfulFactorsFilter.length}`
                                      }
                                    </span>
                                    <ChevronDown className="h-4 w-4" />
                                  </Button>
                                  
                                  {showHarmfulFactorsDropdown && (
                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                      {HARMFUL_FACTORS_OPTIONS.map((factor) => (
                                        <div
                                          key={factor}
                                          className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                          onClick={() => {
                                            const isSelected = contingentHarmfulFactorsFilter.includes(factor);
                                            if (isSelected) {
                                              setContingentHarmfulFactorsFilter(prev => prev.filter(f => f !== factor));
                                            } else {
                                              setContingentHarmfulFactorsFilter(prev => [...prev, factor]);
                                            }
                                          }}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={contingentHarmfulFactorsFilter.includes(factor)}
                                            onChange={() => {}}
                                            className="mr-2"
                                          />
                                          <span className="text-sm">{factor}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {(contingentNameFilter || contingentPositionFilter || contingentDepartmentFilter || contingentHarmfulFactorsFilter.length > 0) && (
                              <div className="mt-3 flex items-center gap-2">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  Найдено: {getFilteredContingent(showContractDrawer).length} из {contingent.filter(emp => emp.contractId === showContractDrawer).length}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setContingentNameFilter('');
                                    setContingentPositionFilter('');
                                    setContingentDepartmentFilter('');
                                    setContingentHarmfulFactorsFilter([]);
                                    setShowHarmfulFactorsDropdown(false);
                                  }}
                                >
                                  Очистить фильтры
                                </Button>
                              </div>
                            )}
                          </div>
                        </Card>

                        <Card>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                  <th className="px-3 py-2 text-left">ФИО</th>
                                  <th className="px-3 py-2 text-left">Должность</th>
                                  <th className="px-3 py-2 text-left">Объект/участок</th>
                                  <th className="px-3 py-2 text-left">Вредные факторы</th>
                                  <th className="px-3 py-2 text-left">Статус осмотра</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {isLoadingContingent ? (
                                  <tr>
                                    <td colSpan={5} className="px-3 py-8 text-center">
                                      <div className="flex items-center justify-center space-x-2">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                        <span className="text-gray-600 dark:text-gray-400">Загрузка контингента...</span>
                                      </div>
                                    </td>
                                  </tr>
                                ) : getFilteredContingent(showContractDrawer).length === 0 ? (
                                  <tr>
                                    <td colSpan={5} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">
                                      {contingentNameFilter || contingentPositionFilter || contingentDepartmentFilter || contingentHarmfulFactorsFilter.length > 0 
                                        ? 'Нет сотрудников, соответствующих фильтрам'
                                        : 'Контингент не загружен'
                                      }
                                    </td>
                                  </tr>
                                ) : getFilteredContingent(showContractDrawer).map((emp) => (
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
                                  <td className="px-3 py-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                      emp.requiresExamination
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    }`}>
                                      {emp.requiresExamination ? 'Требует осмотра' : 'Не требует'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function EmployerContractsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EmployerContractsContent />
    </Suspense>
  );
}