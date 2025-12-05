'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { FileText, Plus, CheckCircle, Clock, Send, X, Search, Building2, Edit, History, XCircle, RefreshCw, Calendar, DollarSign, Users, Upload, Route, Download, ChevronRight, ChevronLeft, FileCheck, Eye, Handshake } from 'lucide-react';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { workflowStoreAPI, ContingentEmployee, CalendarPlan } from '@/lib/store/workflow-store-api';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { userStore } from '@/lib/store/user-store';

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
  history?: ContractHistoryItem[];
  // Поля для субподряда
  is_subcontracted?: boolean;
  subcontract_status?: 'pending' | 'accepted' | 'rejected';
  original_clinic?: number;
  original_clinic_name?: string;
  subcontractor_clinic?: number;
  subcontractor_clinic_name?: string;
  subcontracted_at?: string;
  subcontract_rejection_reason?: string;
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
  // Модальное окно для создания календарного плана
  const [showCalendarPlanModal, setShowCalendarPlanModal] = useState<string | null>(null);
  const [planFormData, setPlanFormData] = useState({
    selectedDepartments: [] as string[],
    useCommonDates: true,
    commonStartDate: '',
    commonEndDate: '',
    departmentDates: {} as Record<string, { startDate: string; endDate: string }>,
    harmfulFactors: [] as string[],
    selectedDoctors: [] as string[],
  });
  const [planCurrentStep, setPlanCurrentStep] = useState(1);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [harmfulFactorsList, setHarmfulFactorsList] = useState<string[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [factorSearch, setFactorSearch] = useState('');
  const [doctorSearch, setDoctorSearch] = useState('');
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [editEmployeeData, setEditEmployeeData] = useState<any>({});
  // Drawer для управления договором
  const [showContractDrawer, setShowContractDrawer] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'contingent' | 'plan' | 'route'>('contingent');
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
  
  // Состояния для субподряда
  const [showSubcontractModal, setShowSubcontractModal] = useState<string | null>(null);
  const [clinics, setClinics] = useState<any[]>([]);
  const [selectedSubcontractorClinic, setSelectedSubcontractorClinic] = useState<string>('');
  const [isSubcontracting, setIsSubcontracting] = useState(false);
  const [clinicSearchQuery, setClinicSearchQuery] = useState('');
  const [subcontractBin, setSubcontractBin] = useState('');
  const [subcontractPhone, setSubcontractPhone] = useState('');
  const [subcontractAmount, setSubcontractAmount] = useState('');
  const [searchingSubcontractBin, setSearchingSubcontractBin] = useState(false);
  const [foundSubcontractClinic, setFoundSubcontractClinic] = useState<any>(null);
  const [subcontractBinSearched, setSubcontractBinSearched] = useState(false);
  
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
    loadClinics();
  }, []);

  const loadClinics = async () => {
    try {
      const clinicsData = await apiClient.getClinics();
      setClinics(clinicsData);
    } catch (error) {
      console.error('Error loading clinics:', error);
    }
  };

  const handleOpenSubcontractModal = async (contractId: string) => {
    const user = userStore.getCurrentUser();
    if (!user) {
      showToast('Пользователь не авторизован', 'error');
      return;
    }
    
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) {
      showToast('Договор не найден', 'error');
      return;
    }
    
    // Проверяем что договор еще не передан на субподряд
    if (contract.is_subcontracted) {
      showToast('Договор уже передан на субподряд', 'warning');
      return;
    }
    
    setShowSubcontractModal(contractId);
    setSelectedSubcontractorClinic('');
    setClinicSearchQuery('');
    setSubcontractBin('');
    setSubcontractPhone('');
    setSubcontractAmount('');
    setFoundSubcontractClinic(null);
    setSubcontractBinSearched(false);
  };

  const handleSearchSubcontractBin = async (bin: string) => {
    if (!bin.trim() || bin.length < 12) {
      setFoundSubcontractClinic(null);
      setSubcontractBinSearched(false);
      return;
    }

    setSearchingSubcontractBin(true);
    setSubcontractBinSearched(false);
    try {
      const result = await apiClient.findClinicByBin(bin);
      setSubcontractBinSearched(true);
      if (result.found) {
        setFoundSubcontractClinic(result.user);
        setSelectedSubcontractorClinic(result.user.id.toString());
        if (result.user.phone) {
          setSubcontractPhone(result.user.phone);
        }
      } else {
        setFoundSubcontractClinic(null);
        setSelectedSubcontractorClinic('');
      }
    } catch (error: any) {
      console.error('Ошибка поиска БИН:', error);
      setFoundSubcontractClinic(null);
      setSubcontractBinSearched(true);
    } finally {
      setSearchingSubcontractBin(false);
    }
  };

  const handleSubcontract = async () => {
    if (!showSubcontractModal) {
      showToast('Ошибка: договор не выбран', 'error');
      return;
    }

    if (!subcontractAmount || parseFloat(subcontractAmount) <= 0) {
      showToast('Укажите сумму субподряда', 'warning');
      return;
    }

    if (!selectedSubcontractorClinic && !subcontractBin) {
      showToast('Выберите клинику-субподрядчика или укажите БИН', 'warning');
      return;
    }

    if (!subcontractPhone) {
      showToast('Укажите телефон клиники-субподрядчика для отправки уведомления', 'warning');
      return;
    }
    
    const user = userStore.getCurrentUser();
    if (!user) {
      showToast('Пользователь не авторизован', 'error');
      return;
    }
    
    setIsSubcontracting(true);
    try {
      await apiClient.subcontractContract(showSubcontractModal, user.id, {
        subcontractor_clinic_id: selectedSubcontractorClinic || undefined,
        subcontractor_clinic_bin: subcontractBin || undefined,
        subcontractor_clinic_phone: subcontractPhone,
        subcontract_amount: parseFloat(subcontractAmount),
      });
      showToast('Договор успешно передан на субподряд. Ожидается подтверждение от клиники-субподрядчика', 'success');
      setShowSubcontractModal(null);
      setSelectedSubcontractorClinic('');
      setSubcontractBin('');
      setSubcontractPhone('');
      setSubcontractAmount('');
      setClinicSearchQuery('');
      setFoundSubcontractClinic(null);
      setSubcontractBinSearched(false);
      loadContracts();
    } catch (error: any) {
      showToast(error.message || 'Ошибка передачи договора на субподряд', 'error');
    } finally {
      setIsSubcontracting(false);
    }
  };

  const handleAcceptSubcontract = async (contractId: string) => {
    const user = userStore.getCurrentUser();
    if (!user) {
      showToast('Пользователь не авторизован', 'error');
      return;
    }
    
    try {
      await apiClient.acceptSubcontract(contractId, user.id);
      showToast('Субподряд принят', 'success');
      loadContracts();
    } catch (error: any) {
      showToast(error.message || 'Ошибка принятия субподряда', 'error');
    }
  };

  const handleRejectSubcontract = async (contractId: string, reason: string) => {
    const user = userStore.getCurrentUser();
    if (!user) {
      showToast('Пользователь не авторизован', 'error');
      return;
    }
    
    if (!reason.trim()) {
      showToast('Укажите причину отклонения', 'warning');
      return;
    }
    
    try {
      await apiClient.rejectSubcontract(contractId, user.id, reason);
      showToast('Субподряд отклонен', 'success');
      loadContracts();
    } catch (error: any) {
      showToast(error.message || 'Ошибка отклонения субподряда', 'error');
    }
  };

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
        amount: c.amount !== null && c.amount !== undefined ? (typeof c.amount === 'string' ? parseFloat(c.amount) : c.amount) : null,
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
        is_subcontracted: c.is_subcontracted,
        subcontract_status: c.subcontract_status,
        original_clinic: c.original_clinic,
        original_clinic_name: c.original_clinic_name,
        subcontractor_clinic: c.subcontractor_clinic,
        subcontractor_clinic_name: c.subcontractor_clinic_name,
        subcontracted_at: c.subcontracted_at,
        subcontract_rejection_reason: c.subcontract_rejection_reason,
      }));
      setContracts(mappedContracts);
      
        // Загружаем контингент и календарные планы для проверки
        try {
          const contingentData = await workflowStoreAPI.getContingent();
          setContingent(contingentData);
          
          const plansData = await workflowStoreAPI.getCalendarPlans();
          setCalendarPlans(plansData);
          
          // Загружаем список вредных факторов и врачей для создания планов
          const factors = await apiClient.getHarmfulFactorsList();
          setHarmfulFactorsList(factors);
          
          const doctorsList = await workflowStoreAPI.getDoctors();
          setDoctors(doctorsList);
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

  // Получение прогресса шагов для договора
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

  // Обработчик открытия Drawer
  const handleOpenContractDrawer = (contractId: string) => {
    setShowContractDrawer(contractId);
    setActiveTab('contingent');
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
      
      // Обновляем список участков для календарного плана
      const contractContingent = updated.filter(emp => emp.contractId === contractId);
      const contractDepartments = [...new Set(contractContingent.map(emp => emp.department))];
      setAvailableDepartments(contractDepartments);
      
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
      
      // Если Drawer открыт, переключаемся на вкладку контингента
      if (showContractDrawer === contractId) {
        setActiveTab('contingent');
      }
    } catch (error: any) {
      showToast(error.message || 'Ошибка загрузки файла', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Обработчик создания календарного плана
  const handleCreateCalendarPlan = (contractId: string) => {
    // Фильтруем контингент по договору
    const contractContingent = contingent.filter(emp => emp.contractId === contractId);
    if (contractContingent.length === 0) {
      showToast('Для этого договора нет загруженного контингента', 'warning');
      return;
    }
    
    // Получаем уникальные участки для этого договора
    const contractDepartments = [...new Set(contractContingent.map(emp => emp.department))];
    setAvailableDepartments(contractDepartments);
    
    // Сбрасываем форму
    setPlanFormData({
      selectedDepartments: [],
      useCommonDates: true,
      commonStartDate: '',
      commonEndDate: '',
      departmentDates: {},
              harmfulFactors: [],
              selectedDoctors: [],
            });
            setPlanCurrentStep(1);
            setFactorSearch('');
            setDoctorSearch('');
            setShowCalendarPlanModal(contractId);
  };

  // Получение контингента по участку для выбранного договора
  const getContingentByDepartment = (contractId: string, department: string): ContingentEmployee[] => {
    return contingent.filter(emp => emp.contractId === contractId && emp.department === department);
  };

  // Создание календарного плана
  const handleSubmitCalendarPlan = async (contractId: string) => {
    if (planFormData.selectedDepartments.length === 0) {
      showToast('Пожалуйста, выберите хотя бы один объект или участок', 'warning');
      return;
    }
    
    if (planFormData.useCommonDates && (!planFormData.commonStartDate || !planFormData.commonEndDate)) {
      showToast('Пожалуйста, укажите даты начала и окончания', 'warning');
      return;
    }
    
    setIsCreatingPlan(true);
    try {
      const departmentsInfo: Array<{department: string; startDate: string; endDate: string; employeeIds: string[]}> = [];
      const allEmployeeIds: string[] = [];
      let minStartDate: string | null = null;
      let maxEndDate: string | null = null;
      
      for (const department of planFormData.selectedDepartments) {
        const departmentEmployees = getContingentByDepartment(contractId, department);
        const employeeIds = departmentEmployees.map(emp => emp.id);
        
        if (employeeIds.length === 0) continue;
        
        let startDate: string;
        let endDate: string;
        
        if (planFormData.useCommonDates) {
          startDate = planFormData.commonStartDate;
          endDate = planFormData.commonEndDate;
        } else {
          const dates = planFormData.departmentDates[department];
          if (!dates || !dates.startDate || !dates.endDate) {
            showToast(`Пожалуйста, укажите даты для объекта/участка: ${department}`, 'warning');
            setIsCreatingPlan(false);
            return;
          }
          startDate = dates.startDate;
          endDate = dates.endDate;
        }
        
        allEmployeeIds.push(...employeeIds);
        
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
        setIsCreatingPlan(false);
        return;
      }
      
      const mainDepartment = planFormData.selectedDepartments[0];
      const planData = {
        department: planFormData.selectedDepartments.length === 1 
          ? mainDepartment 
          : `${planFormData.selectedDepartments.length} участков`,
        startDate: minStartDate!,
        endDate: maxEndDate!,
        employeeIds: [...new Set(allEmployeeIds)],
        departmentsInfo: departmentsInfo,
        harmfulFactors: planFormData.harmfulFactors,
        selectedDoctors: planFormData.selectedDoctors,
        contractId: contractId,
      };
      
      await workflowStoreAPI.addCalendarPlan(planData, planData.employeeIds);
      
      // Обновляем данные
      const updatedPlans = await workflowStoreAPI.getCalendarPlans();
      setCalendarPlans(updatedPlans);
      
      // Если Drawer открыт, переключаемся на вкладку плана
      if (showContractDrawer === contractId) {
        setActiveTab('plan');
      }
      
      setPlanFormData({
        selectedDepartments: [],
        useCommonDates: true,
        commonStartDate: '',
        commonEndDate: '',
        departmentDates: {},
              harmfulFactors: [],
              selectedDoctors: [],
            });
            setPlanCurrentStep(1);
            setFactorSearch('');
            setDoctorSearch('');
            setShowCalendarPlanModal(null);
      showToast(`Успешно создан календарный план для ${departmentsInfo.length} ${departmentsInfo.length === 1 ? 'участка' : 'участков'}`, 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка создания плана', 'error');
    } finally {
      setIsCreatingPlan(false);
    }
  };

  // Функции управления календарными планами
  const handleApprovePlan = async (planId: string) => {
    try {
      await workflowStoreAPI.updateCalendarPlanStatus(planId, 'pending_employer');
      const updatedPlans = await workflowStoreAPI.getCalendarPlans();
      setCalendarPlans(updatedPlans);
      showToast('План отправлен на утверждение работодателю', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка утверждения плана', 'error');
    }
  };

  const handleSendPlanToSES = async (planId: string) => {
    try {
      await workflowStoreAPI.updateCalendarPlanStatus(planId, 'sent_to_ses');
      const updatedPlans = await workflowStoreAPI.getCalendarPlans();
      setCalendarPlans(updatedPlans);
      showToast('План успешно отправлен в СЭС', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка отправки в СЭС', 'error');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот календарный план?')) {
      return;
    }
    try {
      await workflowStoreAPI.deleteCalendarPlan(planId);
      const updatedPlans = await workflowStoreAPI.getCalendarPlans();
      setCalendarPlans(updatedPlans);
      showToast('Календарный план успешно удален', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка удаления плана', 'error');
    }
  };

  const handleGeneratePDF = async (plan: CalendarPlan) => {
    try {
      showToast('Генерация PDF...', 'info');
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      
      const response = await fetch(`${API_URL}/calendar-plans/${plan.id}/export_pdf/`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        let errorMessage = 'Ошибка генерации PDF';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.detail || errorMessage;
        } catch (e) {
          // Игнорируем ошибку парсинга
        }
        throw new Error(errorMessage);
      }
      
      const blob = await response.blob();
      
      if (blob.size === 0) {
        throw new Error('Получен пустой PDF файл');
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = `calendar_plan_${plan.department.replace(/[^a-zA-Z0-9а-яА-Я]/g, '_')}_${plan.startDate}.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      showToast('PDF успешно сгенерирован и скачан', 'success');
    } catch (error: any) {
      console.error('[PDF] Error generating PDF:', error);
      showToast(error.message || 'Ошибка генерации PDF', 'error');
    }
  };

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

  // Загрузка маршрутных листов для договора
  const [routeSheets, setRouteSheets] = useState<any[]>([]);
  const [expandedRouteSheet, setExpandedRouteSheet] = useState<string | null>(null);
  const [routeSheetSearch, setRouteSheetSearch] = useState('');
  const [routeSheetDateFilter, setRouteSheetDateFilter] = useState('');
  
  const loadRouteSheetsForContract = async (contractId: string) => {
    try {
      const allSheets = await workflowStoreAPI.getRouteSheets();
      // Фильтруем по контингенту договора
      const contractEmployeeIds = contingent.filter(emp => emp.contractId === contractId).map(emp => emp.id);
      const contractSheets = allSheets.filter(rs => contractEmployeeIds.includes(rs.patientId));
      setRouteSheets(contractSheets);
    } catch (error) {
      console.error('Error loading route sheets:', error);
    }
  };

  // Загружаем маршрутные листы при открытии вкладки
  useEffect(() => {
    if (showContractDrawer && activeTab === 'route') {
      loadRouteSheetsForContract(showContractDrawer);
    }
  }, [showContractDrawer, activeTab, contingent]);

  // Функции управления контингентом
  const handleEditEmployee = (employee: ContingentEmployee) => {
    setEditingEmployee(employee.id);
    setEditEmployeeData({
      name: employee.name,
      position: employee.position,
      department: employee.department,
      birthDate: employee.birthDate,
      gender: employee.gender,
      harmfulFactors: employee.harmfulFactors || [],
      notes: (employee as any).notes || '',
    });
  };

  const handleSaveEmployee = async () => {
    if (!editingEmployee) return;
    
    try {
      await workflowStoreAPI.updateContingentEmployee(editingEmployee, editEmployeeData);
      const updated = await workflowStoreAPI.getContingent();
      setContingent(updated);
      setEditingEmployee(null);
      setEditEmployeeData({});
      showToast('Изменения успешно сохранены', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка сохранения', 'error');
    }
  };

  const handleCancelEditEmployee = () => {
    setEditingEmployee(null);
    setEditEmployeeData({});
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого сотрудника?')) return;
    
    try {
      await workflowStoreAPI.deleteContingentEmployee(employeeId);
      const updated = await workflowStoreAPI.getContingent();
      setContingent(updated);
      showToast('Сотрудник успешно удален', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка удаления', 'error');
    }
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
                  <option value="active">Действует</option>
                  <option value="in_progress">В процессе исполнения</option>
                  <option value="partially_executed">Частично исполнен</option>
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

        {/* Модальное окно создания календарного плана */}
        <Modal
          isOpen={showCalendarPlanModal !== null}
          onClose={() => {
            setShowCalendarPlanModal(null);
            setPlanFormData({
              selectedDepartments: [],
              useCommonDates: true,
              commonStartDate: '',
              commonEndDate: '',
              departmentDates: {},
              harmfulFactors: [],
              selectedDoctors: [],
            });
            setPlanCurrentStep(1);
            setFactorSearch('');
            setDoctorSearch('');
          }}
          title="Создать календарный план"
          size="xl"
        >
          {showCalendarPlanModal && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Договор: <strong>№{contracts.find(c => c.id === showCalendarPlanModal)?.contract_number}</strong>
                </p>
              </div>

              {/* Индикатор шагов */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div className={`flex items-center ${planCurrentStep >= 1 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${planCurrentStep >= 1 ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}`}>
                      {planCurrentStep > 1 ? '✓' : '1'}
                    </div>
                    <span className="ml-2 text-sm font-medium">Участки</span>
                  </div>
                  <div className={`flex-1 h-0.5 mx-2 ${planCurrentStep >= 2 ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                  <div className={`flex items-center ${planCurrentStep >= 2 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${planCurrentStep >= 2 ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}`}>
                      {planCurrentStep > 2 ? '✓' : '2'}
                    </div>
                    <span className="ml-2 text-sm font-medium">Даты</span>
                  </div>
                  <div className={`flex-1 h-0.5 mx-2 ${planCurrentStep >= 3 ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                  <div className={`flex items-center ${planCurrentStep >= 3 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${planCurrentStep >= 3 ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}`}>
                      3
                    </div>
                    <span className="ml-2 text-sm font-medium">Дополнительно</span>
                  </div>
                </div>
              </div>

              {/* Шаг 1: Выбор участков */}
              {planCurrentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Выберите объекты/участки *
                    </label>
                    <div className="border border-gray-300 dark:border-gray-700 rounded-lg max-h-64 overflow-y-auto">
                      {availableDepartments.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500">Нет доступных участков для этого договора</p>
                      ) : (
                        availableDepartments.map(dept => {
                          const count = getContingentByDepartment(showCalendarPlanModal, dept).length;
                          const isSelected = planFormData.selectedDepartments.includes(dept);
                          return (
                            <label
                              key={dept}
                              className={`flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                                isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setPlanFormData({
                                        ...planFormData,
                                        selectedDepartments: [...planFormData.selectedDepartments, dept],
                                        departmentDates: {
                                          ...planFormData.departmentDates,
                                          [dept]: planFormData.departmentDates[dept] || { startDate: '', endDate: '' }
                                        }
                                      });
                                    } else {
                                      const newDates = { ...planFormData.departmentDates };
                                      delete newDates[dept];
                                      setPlanFormData({
                                        ...planFormData,
                                        selectedDepartments: planFormData.selectedDepartments.filter(d => d !== dept),
                                        departmentDates: newDates
                                      });
                                    }
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium">{dept}</span>
                              </div>
                              <span className="text-xs text-gray-500">{count} сотрудников</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCalendarPlanModal(null)}
                    >
                      Отмена
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        if (planFormData.selectedDepartments.length > 0) {
                          setPlanCurrentStep(2);
                        } else {
                          showToast('Выберите хотя бы один участок', 'warning');
                        }
                      }}
                      disabled={planFormData.selectedDepartments.length === 0}
                    >
                      Далее <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Шаг 2: Даты */}
              {planCurrentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center gap-2 mb-4">
                      <input
                        type="checkbox"
                        checked={planFormData.useCommonDates}
                        onChange={(e) => setPlanFormData({ ...planFormData, useCommonDates: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium">Использовать одинаковые даты для всех участков</span>
                    </label>

                    {planFormData.useCommonDates ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Дата начала *
                          </label>
                          <Input
                            type="date"
                            value={planFormData.commonStartDate}
                            onChange={(e) => setPlanFormData({ ...planFormData, commonStartDate: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Дата окончания *
                          </label>
                          <Input
                            type="date"
                            value={planFormData.commonEndDate}
                            onChange={(e) => setPlanFormData({ ...planFormData, commonEndDate: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {planFormData.selectedDepartments.map(dept => (
                          <div key={dept} className="grid grid-cols-3 gap-3 items-end">
                            <div className="col-span-1">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {dept}
                              </label>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Начало</label>
                              <Input
                                type="date"
                                value={planFormData.departmentDates[dept]?.startDate || ''}
                                onChange={(e) => setPlanFormData({
                                  ...planFormData,
                                  departmentDates: {
                                    ...planFormData.departmentDates,
                                    [dept]: {
                                      ...planFormData.departmentDates[dept],
                                      startDate: e.target.value
                                    }
                                  }
                                })}
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Окончание</label>
                              <Input
                                type="date"
                                value={planFormData.departmentDates[dept]?.endDate || ''}
                                onChange={(e) => setPlanFormData({
                                  ...planFormData,
                                  departmentDates: {
                                    ...planFormData.departmentDates,
                                    [dept]: {
                                      ...planFormData.departmentDates[dept],
                                      endDate: e.target.value
                                    }
                                  }
                                })}
                                required
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPlanCurrentStep(1)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Назад
                    </Button>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCalendarPlanModal(null)}
                      >
                        Отмена
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          // Валидация дат
                          let isValid = true;
                          if (planFormData.useCommonDates) {
                            if (!planFormData.commonStartDate || !planFormData.commonEndDate) {
                              isValid = false;
                              showToast('Пожалуйста, укажите даты начала и окончания', 'warning');
                            }
                          } else {
                            for (const dept of planFormData.selectedDepartments) {
                              const dates = planFormData.departmentDates[dept];
                              if (!dates || !dates.startDate || !dates.endDate) {
                                isValid = false;
                                showToast(`Пожалуйста, укажите даты для объекта/участка: ${dept}`, 'warning');
                                break;
                              }
                            }
                          }
                          
                          if (isValid) {
                            setPlanCurrentStep(3);
                          }
                        }}
                      >
                        Далее <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Шаг 3: Дополнительные настройки */}
              {planCurrentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Шаг 3: Дополнительные настройки</h3>
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
                    
                    {/* Поиск и кнопки управления */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                          type="text"
                          placeholder="Поиск вредных факторов..."
                          value={factorSearch}
                          onChange={(e) => setFactorSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const filtered = harmfulFactorsList.filter(factor => 
                            !factorSearch || factor.toLowerCase().includes(factorSearch.toLowerCase())
                          );
                          
                          const allSelected = filtered.every(factor => planFormData.harmfulFactors.includes(factor));
                          
                          if (allSelected) {
                            setPlanFormData({
                              ...planFormData,
                              harmfulFactors: planFormData.harmfulFactors.filter(f => !filtered.includes(f)),
                            });
                          } else {
                            setPlanFormData({
                              ...planFormData,
                              harmfulFactors: [...new Set([...planFormData.harmfulFactors, ...filtered])],
                            });
                          }
                        }}
                        disabled={harmfulFactorsList.length === 0}
                      >
                        {harmfulFactorsList.filter(factor => 
                          !factorSearch || factor.toLowerCase().includes(factorSearch.toLowerCase())
                        ).every(factor => planFormData.harmfulFactors.includes(factor)) && harmfulFactorsList.filter(factor => 
                          !factorSearch || factor.toLowerCase().includes(factorSearch.toLowerCase())
                        ).length > 0 ? 'Снять все' : 'Выбрать все'}
                      </Button>
                    </div>

                    {/* Список вредных факторов */}
                    <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                                Вредный фактор
                              </th>
                              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase w-12">
                                <input
                                  type="checkbox"
                                  checked={
                                    harmfulFactorsList.filter(factor => 
                                      !factorSearch || factor.toLowerCase().includes(factorSearch.toLowerCase())
                                    ).length > 0 &&
                                    harmfulFactorsList.filter(factor => 
                                      !factorSearch || factor.toLowerCase().includes(factorSearch.toLowerCase())
                                    ).every(factor => planFormData.harmfulFactors.includes(factor))
                                  }
                                  onChange={(e) => {
                                    const filtered = harmfulFactorsList.filter(factor => 
                                      !factorSearch || factor.toLowerCase().includes(factorSearch.toLowerCase())
                                    );
                                    
                                    if (e.target.checked) {
                                      setPlanFormData({
                                        ...planFormData,
                                        harmfulFactors: [...new Set([...planFormData.harmfulFactors, ...filtered])],
                                      });
                                    } else {
                                      setPlanFormData({
                                        ...planFormData,
                                        harmfulFactors: planFormData.harmfulFactors.filter(f => !filtered.includes(f)),
                                      });
                                    }
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {harmfulFactorsList
                              .filter(factor => 
                                !factorSearch || factor.toLowerCase().includes(factorSearch.toLowerCase())
                              )
                              .map((factor) => {
                                const isSelected = planFormData.harmfulFactors.includes(factor);
                                return (
                                  <tr
                                    key={factor}
                                    className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${
                                      isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                    }`}
                                    onClick={() => {
                                      if (isSelected) {
                                        setPlanFormData({
                                          ...planFormData,
                                          harmfulFactors: planFormData.harmfulFactors.filter(f => f !== factor),
                                        });
                                      } else {
                                        setPlanFormData({
                                          ...planFormData,
                                          harmfulFactors: [...planFormData.harmfulFactors, factor],
                                        });
                                      }
                                    }}
                                  >
                                    <td className="px-4 py-3">
                                      <span className="text-sm text-gray-900 dark:text-white">
                                        {factor}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setPlanFormData({
                                              ...planFormData,
                                              harmfulFactors: [...planFormData.harmfulFactors, factor],
                                            });
                                          } else {
                                            setPlanFormData({
                                              ...planFormData,
                                              harmfulFactors: planFormData.harmfulFactors.filter(f => f !== factor),
                                            });
                                          }
                                        }}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {planFormData.harmfulFactors.length > 0 && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          ✓ Выбрано: {planFormData.harmfulFactors.length} {planFormData.harmfulFactors.length === 1 ? 'фактор' : planFormData.harmfulFactors.length < 5 ? 'фактора' : 'факторов'}
                        </p>
                      </div>
                    )}
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
                    
                    {/* Поиск и кнопки управления */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                          type="text"
                          placeholder="Поиск врачей по имени или специализации..."
                          value={doctorSearch}
                          onChange={(e) => setDoctorSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const filtered = doctors.filter(doc => {
                            const searchLower = doctorSearch.toLowerCase();
                            return !doctorSearch || 
                              doc.name?.toLowerCase().includes(searchLower) ||
                              doc.specialization?.toLowerCase().includes(searchLower);
                          }).map(d => d.id);
                          
                          const allSelected = filtered.every(id => planFormData.selectedDoctors.includes(id));
                          
                          if (allSelected) {
                            setPlanFormData({
                              ...planFormData,
                              selectedDoctors: planFormData.selectedDoctors.filter(id => !filtered.includes(id)),
                            });
                          } else {
                            setPlanFormData({
                              ...planFormData,
                              selectedDoctors: [...new Set([...planFormData.selectedDoctors, ...filtered])],
                            });
                          }
                        }}
                        disabled={doctors.length === 0}
                      >
                        {doctors.filter(doc => {
                          const searchLower = doctorSearch.toLowerCase();
                          return !doctorSearch || 
                            doc.name?.toLowerCase().includes(searchLower) ||
                            doc.specialization?.toLowerCase().includes(searchLower);
                        }).every(doc => planFormData.selectedDoctors.includes(doc.id)) && doctors.filter(doc => {
                          const searchLower = doctorSearch.toLowerCase();
                          return !doctorSearch || 
                            doc.name?.toLowerCase().includes(searchLower) ||
                            doc.specialization?.toLowerCase().includes(searchLower);
                        }).length > 0 ? 'Снять все' : 'Выбрать все'}
                      </Button>
                    </div>

                    {/* Список врачей */}
                    {doctors.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Врачи не добавлены. Добавьте врачей в разделе &quot;Врачи&quot;.
                      </p>
                    ) : (
                      <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                        <div className="max-h-64 overflow-y-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                                  Врач
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                                  Специализация
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                                  Кабинет
                                </th>
                                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase w-12">
                                  <input
                                    type="checkbox"
                                    checked={
                                      doctors.filter(doc => {
                                        const searchLower = doctorSearch.toLowerCase();
                                        return !doctorSearch || 
                                          doc.name?.toLowerCase().includes(searchLower) ||
                                          doc.specialization?.toLowerCase().includes(searchLower);
                                      }).length > 0 &&
                                      doctors.filter(doc => {
                                        const searchLower = doctorSearch.toLowerCase();
                                        return !doctorSearch || 
                                          doc.name?.toLowerCase().includes(searchLower) ||
                                          doc.specialization?.toLowerCase().includes(searchLower);
                                      }).every(doc => planFormData.selectedDoctors.includes(doc.id))
                                    }
                                    onChange={(e) => {
                                      const filtered = doctors.filter(doc => {
                                        const searchLower = doctorSearch.toLowerCase();
                                        return !doctorSearch || 
                                          doc.name?.toLowerCase().includes(searchLower) ||
                                          doc.specialization?.toLowerCase().includes(searchLower);
                                      }).map(d => d.id);
                                      
                                      if (e.target.checked) {
                                        setPlanFormData({
                                          ...planFormData,
                                          selectedDoctors: [...new Set([...planFormData.selectedDoctors, ...filtered])],
                                        });
                                      } else {
                                        setPlanFormData({
                                          ...planFormData,
                                          selectedDoctors: planFormData.selectedDoctors.filter(id => !filtered.includes(id)),
                                        });
                                      }
                                    }}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                              {doctors
                                .filter(doc => {
                                  const searchLower = doctorSearch.toLowerCase();
                                  return !doctorSearch || 
                                    doc.name?.toLowerCase().includes(searchLower) ||
                                    doc.specialization?.toLowerCase().includes(searchLower);
                                })
                                .map((doctor) => {
                                  const isSelected = planFormData.selectedDoctors.includes(doctor.id);
                                  return (
                                    <tr
                                      key={doctor.id}
                                      className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${
                                        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                      }`}
                                      onClick={() => {
                                        if (isSelected) {
                                          setPlanFormData({
                                            ...planFormData,
                                            selectedDoctors: planFormData.selectedDoctors.filter(id => id !== doctor.id),
                                          });
                                        } else {
                                          setPlanFormData({
                                            ...planFormData,
                                            selectedDoctors: [...planFormData.selectedDoctors, doctor.id],
                                          });
                                        }
                                      }}
                                    >
                                      <td className="px-4 py-3">
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                                          {doctor.name}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                          {doctor.specialization || '—'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                          {doctor.cabinet ? `Каб. ${doctor.cabinet}` : '—'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setPlanFormData({
                                                ...planFormData,
                                                selectedDoctors: [...planFormData.selectedDoctors, doctor.id],
                                              });
                                            } else {
                                              setPlanFormData({
                                                ...planFormData,
                                                selectedDoctors: planFormData.selectedDoctors.filter(id => id !== doctor.id),
                                              });
                                            }
                                          }}
                                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {planFormData.selectedDoctors.length > 0 && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          ✓ Выбрано: {planFormData.selectedDoctors.length} {planFormData.selectedDoctors.length === 1 ? 'врач' : planFormData.selectedDoctors.length < 5 ? 'врача' : 'врачей'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPlanCurrentStep(2)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Назад
                    </Button>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCalendarPlanModal(null)}
                      >
                        Отмена
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleSubmitCalendarPlan(showCalendarPlanModal)}
                        disabled={isCreatingPlan}
                      >
                        {isCreatingPlan ? 'Создание...' : 'Создать план'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
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
                                {contract.amount !== null && contract.amount !== undefined 
                                  ? `${contract.amount.toLocaleString('ru-RU')} ₸`
                                  : '—'}
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
                      {/* Кнопка передачи на субподряд - только для договоров, которые еще не переданы */}
                      {!contract.is_subcontracted && (contract.status === 'approved' || contract.status === 'active' || contract.status === 'in_progress') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenSubcontractModal(contract.id)}
                          title="Передать договор на субподряд другой клинике"
                          className="border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                        >
                          <Handshake className="h-4 w-4 mr-1" />
                          Субподряд
                        </Button>
                      )}
                      {/* Индикатор и действия для субподряда */}
                      {contract.is_subcontracted && (
                        <>
                          {contract.subcontract_status === 'pending' && contract.subcontractor_clinic === parseInt(userStore.getCurrentUser()?.id || '0') && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleAcceptSubcontract(contract.id)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Принять
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const reason = prompt('Укажите причину отклонения:');
                                  if (reason) {
                                    handleRejectSubcontract(contract.id, reason);
                                  }
                                }}
                                className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Отклонить
                              </Button>
                            </div>
                          )}
                          {contract.subcontract_status === 'accepted' && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <span className="text-xs text-green-700 dark:text-green-300">
                                Субподряд принят
                              </span>
                            </div>
                          )}
                          {contract.subcontract_status === 'rejected' && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                              <span className="text-xs text-red-700 dark:text-red-300">
                                Субподряд отклонен
                              </span>
                            </div>
                          )}
                          {contract.subcontract_status === 'pending' && contract.original_clinic === parseInt(userStore.getCurrentUser()?.id || '0') && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                              <span className="text-xs text-yellow-700 dark:text-yellow-300">
                                Ожидает подтверждения
                              </span>
                            </div>
                          )}
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
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Контингент договора</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {contractContingent.length} сотрудников
                        </p>
                      </div>
                      <Button onClick={() => handleUploadContingent(showContractDrawer)}>
                        <Upload className="h-4 w-4 mr-2" />
                        Загрузить контингент
                      </Button>
                    </div>

                    {contractContingent.length === 0 ? (
                      <Card>
                        <div className="text-center py-12">
                          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Контингент не загружен</h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Загрузите Excel-файл со списком сотрудников
                          </p>
                          <Button onClick={() => handleUploadContingent(showContractDrawer)}>
                            <Upload className="h-4 w-4 mr-2" />
                            Загрузить файл
                          </Button>
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
                                <th className="px-3 py-2 text-right">Действия</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {contractContingent.map((emp) => (
                                <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                  {editingEmployee === emp.id ? (
                                    <>
                                      <td className="px-3 py-2">
                                        <Input
                                          value={editEmployeeData.name || ''}
                                          onChange={(e) => setEditEmployeeData({ ...editEmployeeData, name: e.target.value })}
                                          className="w-full"
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <Input
                                          value={editEmployeeData.position || ''}
                                          onChange={(e) => setEditEmployeeData({ ...editEmployeeData, position: e.target.value })}
                                          className="w-full"
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <Input
                                          value={editEmployeeData.department || ''}
                                          onChange={(e) => setEditEmployeeData({ ...editEmployeeData, department: e.target.value })}
                                          className="w-full"
                                        />
                                      </td>
                                      <td className="px-3 py-2">
                                        <Input
                                          value={Array.isArray(editEmployeeData.harmfulFactors) ? editEmployeeData.harmfulFactors.join(', ') : ''}
                                          onChange={(e) => setEditEmployeeData({ ...editEmployeeData, harmfulFactors: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                          className="w-full"
                                          placeholder="через запятую"
                                        />
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleSaveEmployee}
                                          >
                                            <CheckCircle className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCancelEditEmployee}
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </td>
                                    </>
                                  ) : (
                                    <>
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
                                      <td className="px-3 py-2 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEditEmployee(emp)}
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDeleteEmployee(emp.id)}
                                            className="text-red-600 hover:text-red-700"
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </td>
                                    </>
                                  )}
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
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Календарные планы</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {contractPlans.length} планов
                        </p>
                      </div>
                      <Button 
                        onClick={() => handleCreateCalendarPlan(showContractDrawer)}
                        disabled={!progress.contingent}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Создать план
                      </Button>
                    </div>

                    {!progress.contingent ? (
                      <Card>
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            Сначала необходимо загрузить контингент
                          </p>
                        </div>
                      </Card>
                    ) : contractPlans.length === 0 ? (
                      <Card>
                        <div className="text-center py-12">
                          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Планы не созданы</h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Создайте календарный план для этого договора
                          </p>
                          <Button onClick={() => handleCreateCalendarPlan(showContractDrawer)}>
                            <Calendar className="h-4 w-4 mr-2" />
                            Создать план
                          </Button>
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
                                      <div className="flex items-center justify-end gap-2">
                                        {plan.status === 'draft' && (
                                          <>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleApprovePlan(plan.id)}
                                            >
                                              <Send className="h-4 w-4 mr-1" />
                                              Согласовать
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleDeletePlan(plan.id)}
                                              className="text-red-600 hover:text-red-700"
                                            >
                                              <X className="h-4 w-4 mr-1" />
                                              Удалить
                                            </Button>
                                          </>
                                        )}
                                        {plan.status === 'approved' && (
                                          <>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleSendPlanToSES(plan.id)}
                                            >
                                              <Send className="h-4 w-4 mr-1" />
                                              В СЭС
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleGeneratePDF(plan)}
                                            >
                                              <Download className="h-4 w-4 mr-1" />
                                              PDF
                                            </Button>
                                          </>
                                        )}
                                        {plan.status === 'sent_to_ses' && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleGeneratePDF(plan)}
                                          >
                                            <Download className="h-4 w-4 mr-1" />
                                            PDF
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
                                      </div>
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
                                                // Проверка валидности дат
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

      {/* Модальное окно для передачи на субподряд */}
      <Modal
        isOpen={showSubcontractModal !== null}
        onClose={() => {
          setShowSubcontractModal(null);
          setSelectedSubcontractorClinic('');
          setClinicSearchQuery('');
          setSubcontractBin('');
          setSubcontractPhone('');
          setSubcontractAmount('');
          setFoundSubcontractClinic(null);
          setSubcontractBinSearched(false);
        }}
        title="Передача договора на субподряд"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              При передаче договора на субподряд, клиника-субподрядчик будет выполнять всю работу от вашего имени. 
              Все документы будут отправляться работодателю от вашей клиники, но фактическую работу будет выполнять субподрядчик.
            </p>
          </div>

          {/* Поле суммы субподряда */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Сумма субподряда (тенге) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              placeholder="Введите сумму субподряда"
              value={subcontractAmount}
              onChange={(e) => setSubcontractAmount(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          {/* Поиск по БИН/ИНН */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              БИН/ИНН клиники-субподрядчика
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Введите БИН/ИНН (12 цифр)"
                value={subcontractBin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                  setSubcontractBin(value);
                  if (value.length === 12) {
                    handleSearchSubcontractBin(value);
                  } else {
                    setFoundSubcontractClinic(null);
                    setSubcontractBinSearched(false);
                    setSelectedSubcontractorClinic('');
                  }
                }}
                maxLength={12}
              />
              {searchingSubcontractBin && (
                <RefreshCw className="h-5 w-5 animate-spin text-gray-400 self-center" />
              )}
            </div>
            {subcontractBinSearched && (
              <div className="mt-2">
                {foundSubcontractClinic ? (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                      ✓ Клиника найдена: {foundSubcontractClinic.registration_data?.name || 'Клиника'}
                    </p>
                    {foundSubcontractClinic.phone && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Телефон: {foundSubcontractClinic.phone}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Клиника с таким БИН не найдена. Укажите телефон для отправки уведомления.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Поле телефона */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Телефон клиники-субподрядчика <span className="text-red-500">*</span>
            </label>
            <PhoneInput
              value={subcontractPhone}
              onChange={(value) => setSubcontractPhone(value)}
              placeholder="+7 (___) ___-__-__"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              На этот номер будет отправлено уведомление о передаче договора на субподряд
            </p>
          </div>

          {/* Список зарегистрированных клиник (альтернатива поиску по БИН) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Или выберите из списка зарегистрированных клиник
            </label>
            <Input
              type="text"
              placeholder="Поиск клиники..."
              value={clinicSearchQuery}
              onChange={(e) => setClinicSearchQuery(e.target.value)}
              className="mb-3"
            />
            <div className="max-h-64 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-lg">
              {clinics
                .filter(clinic => {
                  const name = clinic.registration_data?.name || '';
                  const searchLower = clinicSearchQuery.toLowerCase();
                  return name.toLowerCase().includes(searchLower);
                })
                .map((clinic) => {
                  const clinicName = clinic.registration_data?.name || `Клиника #${clinic.id}`;
                  const isSelected = selectedSubcontractorClinic === clinic.id.toString();
                  return (
                    <div
                      key={clinic.id}
                      onClick={() => {
                        setSelectedSubcontractorClinic(clinic.id.toString());
                        if (clinic.phone) {
                          setSubcontractPhone(clinic.phone);
                        }
                        const regData = clinic.registration_data || {};
                        const bin = regData.bin || regData.inn || '';
                        if (bin) {
                          setSubcontractBin(bin);
                        }
                      }}
                      className={`p-3 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                        isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{clinicName}</p>
                          {clinic.registration_data?.inn && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">ИНН: {clinic.registration_data.inn}</p>
                          )}
                        </div>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                    </div>
                  );
                })}
              {clinics.filter(clinic => {
                const name = clinic.registration_data?.name || '';
                return name.toLowerCase().includes(clinicSearchQuery.toLowerCase());
              }).length === 0 && (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  Клиники не найдены
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => {
                setShowSubcontractModal(null);
                setSelectedSubcontractorClinic('');
                setClinicSearchQuery('');
                setSubcontractBin('');
                setSubcontractPhone('');
                setSubcontractAmount('');
                setFoundSubcontractClinic(null);
                setSubcontractBinSearched(false);
              }}
              disabled={isSubcontracting}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSubcontract}
              disabled={!subcontractAmount || !subcontractPhone || isSubcontracting}
            >
              {isSubcontracting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Передача...
                </>
              ) : (
                <>
                  <Handshake className="h-4 w-4 mr-2" />
                  Передать на субподряд
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

