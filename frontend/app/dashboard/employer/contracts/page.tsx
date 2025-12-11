'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { 
  FileText, CheckCircle, Clock, Send, X, Download, Upload, 
  Search, Filter, Building2, Calendar, Users, DollarSign, ChevronRight, ChevronDown, ChevronLeft,
  AlertCircle, CheckCircle2, XCircle, Hourglass, Ban, Eye, MoreVertical, Route, FileCheck
} from 'lucide-react';
import { workflowStoreAPI, ContingentEmployee, CalendarPlan } from '@/lib/store/workflow-store-api';
import { userStore } from '@/lib/store/user-store';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { Edit2, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

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
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  // Данные для Drawer
  const [contingent, setContingent] = useState<ContingentEmployee[]>([]);
  const [calendarPlans, setCalendarPlans] = useState<CalendarPlan[]>([]);
  const [routeSheets, setRouteSheets] = useState<any[]>([]);
  const [showContractDrawer, setShowContractDrawer] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'contingent' | 'plan' | 'route'>('contingent');
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [expandedDepartment, setExpandedDepartment] = useState<string | null>(null);
  const [departmentEmployeeSearch, setDepartmentEmployeeSearch] = useState<Record<string, string>>({});
  const [departmentEmployeePage, setDepartmentEmployeePage] = useState<Record<string, number>>({});
  const [routeSheetSearch, setRouteSheetSearch] = useState('');
  const [routeSheetDateFilter, setRouteSheetDateFilter] = useState('');
  const [expandedRouteSheet, setExpandedRouteSheet] = useState<string | null>(null);
  
  // Загрузка контингента
  const [isUploading, setIsUploading] = useState(false);
  
  // Управление сотрудниками
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState<Partial<ContingentEmployee>>({});
  const [showEditHarmfulFactorsDropdown, setShowEditHarmfulFactorsDropdown] = useState(false);
  const [editHarmfulFactorsSearch, setEditHarmfulFactorsSearch] = useState('');
  const [editAttempted, setEditAttempted] = useState(false);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState<Partial<ContingentEmployee>>({});
  const [showCreateHarmfulFactorsDropdown, setShowCreateHarmfulFactorsDropdown] = useState(false);
  const [createHarmfulFactorsSearch, setCreateHarmfulFactorsSearch] = useState('');
  const [createAttempted, setCreateAttempted] = useState(false);
  const [selectedContractForUpload, setSelectedContractForUpload] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState<string | null>(null);
  
  // Модальное окно для отклонения календарного плана
  const [showRejectPlanModal, setShowRejectPlanModal] = useState<string | null>(null);
  const [rejectPlanReason, setRejectPlanReason] = useState('');
  
  // Фильтры и поиск
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Фильтры для контингента
  const [contingentNameFilter, setContingentNameFilter] = useState('');
  const [contingentPositionFilter, setContingentPositionFilter] = useState('');
  const [contingentDepartmentFilter, setContingentDepartmentFilter] = useState('');
  const [contingentHarmfulFactorsFilter, setContingentHarmfulFactorsFilter] = useState<string[]>([]);
  const [showContingentFilters, setShowContingentFilters] = useState(false);
  const [showHarmfulFactorsDropdown, setShowHarmfulFactorsDropdown] = useState(false);
  
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

  // Закрытие выпадающего списка при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.harmful-factors-dropdown')) {
        setShowHarmfulFactorsDropdown(false);
      }
    };

    if (showHarmfulFactorsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showHarmfulFactorsDropdown]);

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

  // Обработка отклонения календарного плана
  const handleRejectPlan = async (planId: string) => {
    if (!rejectPlanReason.trim()) {
      showToast('Пожалуйста, укажите причину отклонения', 'warning');
      return;
    }
    
    try {
      await workflowStoreAPI.updateCalendarPlanStatus(planId, 'rejected', rejectPlanReason);
      const updatedPlans = await workflowStoreAPI.getCalendarPlans();
      setCalendarPlans(updatedPlans);
      showToast('План отклонен. Клиника получит уведомление с причиной отклонения.', 'success');
      setRejectPlanReason('');
      setShowRejectPlanModal(null);
    } catch (error: any) {
      showToast(error.message || 'Ошибка отклонения плана', 'error');
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

  // Фильтрация контингента
  const getFilteredContingent = (contractId: string): ContingentEmployee[] => {
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
            
            const result = exactMatch || normalizedMatch || partialMatch;
            
            // Отладка для п.1
            if (selectedFactor.includes('п.1')) {
              console.log('Фильтр отладка (работодатель):', {
                empName: emp.name,
                selectedFactor,
                empFactor,
                normalizedSelected,
                normalizedEmp,
                exactMatch,
                normalizedMatch,
                partialMatch,
                result
              });
            }
            
            return result;
          });
        });
      
      return matchesName && matchesPosition && matchesDepartment && matchesHarmfulFactors;
    });
  };

  const getCalendarPlansCount = (contractId: string): number => {
    return calendarPlans.filter(plan => plan.contractId === contractId).length;
  };

  const hasApprovedPlan = (contractId: string): boolean => {
    return calendarPlans.some(plan => 
      plan.contractId === contractId && 
      plan.status === 'approved'
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

  const getEmployeesByIds = (employeeIds: string[]): ContingentEmployee[] => {
    return contingent.filter(emp => employeeIds.includes(emp.id));
  };

  const handleOpenContractDrawer = (contractId: string) => {
    setShowContractDrawer(contractId);
    setActiveTab('contingent');
  };

  // Обработчик перехода к странице договора
  const handleOpenContractPage = (contractId: string) => {
    // Переходим на отдельную страницу договора
    window.location.href = `/dashboard/employer/contracts/${contractId}`;
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
        showToast('Контингент успешно загружен!', 'success');
      }
    } catch (error: any) {
      showToast(error.message || 'Ошибка загрузки файла', 'error');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleUploadContingent = (contractId: string) => {
    setSelectedContractForUpload(contractId);
    setShowUploadModal(contractId);
  };

  // Обработчик экспорта контингента
  const handleExportContingent = async (contractId: string) => {
    try {
      const contract = contracts.find(c => c.id === contractId);
      if (!contract) {
        showToast('Договор не найден', 'error');
        return;
      }

      // Получаем контингент для конкретного договора
      const contractContingent = contingent.filter(emp => emp.contractId === contractId);
      const contingentData = contractContingent.map(employee => ({
        'ФИО': employee.name,
        'Должность': employee.position,
        'Объект/участок': employee.department,
        'ИИН': employee.iin,
        'Телефон': employee.phone || '',
        'Дата рождения': employee.birthDate || '',
        'Пол': employee.gender === 'male' ? 'Мужской' : employee.gender === 'female' ? 'Женский' : '',
        'Вредные факторы': employee.harmfulFactors.join(', '),
        'Требует осмотра': employee.requiresExamination ? 'Да' : 'Нет',
        'Последний осмотр': employee.lastExaminationDate || '',
        'Следующий осмотр': employee.nextExaminationDate || '',
        'Общий стаж': employee.totalExperienceYears || '',
        'Стаж по должности': employee.positionExperienceYears || '',
        'Примечания': employee.notes || ''
      }));

      if (contingentData.length === 0) {
        showToast('Нет данных для экспорта', 'warning');
        return;
      }

      // Создаем Excel файл
      const ws = XLSX.utils.json_to_sheet(contingentData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Контингент');

      // Скачиваем файл
      const fileName = `Контингент_${contract.contract_number}_${new Date().toLocaleDateString('ru-RU')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      showToast('Файл успешно загружен', 'success');
    } catch (error: any) {
      console.error('Export error:', error);
      showToast(error.message || 'Ошибка экспорта', 'error');
    }
  };

  const handleEditEmployee = (employee: ContingentEmployee) => {
    setEditingEmployee(employee.id);
    setEditData({
      name: employee.name,
      position: employee.position,
      department: employee.department,
      birthDate: employee.birthDate,
      gender: employee.gender,
      phone: employee.phone,
      totalExperienceYears: employee.totalExperienceYears,
      positionExperienceYears: employee.positionExperienceYears,
      lastExaminationDate: employee.lastExaminationDate,
      harmfulFactors: employee.harmfulFactors || [],
      notes: (employee as any).notes || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEmployee = async () => {
    if (!editingEmployee) return;
    
    setEditAttempted(true);
    
    const missingFields = [];
    if (!editData.name?.trim()) missingFields.push('ФИО');
    if (!editData.department?.trim()) missingFields.push('Объект/участок');
    if (!editData.position?.trim()) missingFields.push('Должность');
    if (!editData.birthDate) missingFields.push('Дата рождения');
    if (!editData.gender) missingFields.push('Пол');
    if (editData.totalExperienceYears === undefined || editData.totalExperienceYears === null) missingFields.push('Общий стаж');
    if (editData.positionExperienceYears === undefined || editData.positionExperienceYears === null) missingFields.push('Стаж по должности');

    if (!editData.harmfulFactors || editData.harmfulFactors.length === 0) {
      missingFields.push('Вредные факторы');
    }
    
    if (missingFields.length > 0) {
      showToast(`❌ Заполните обязательные поля: ${missingFields.join(', ')}`, 'error');
      return;
    }
    
    try {
      const user = userStore.getCurrentUser();
      await workflowStoreAPI.updateContingentEmployee(user?.id || '', editingEmployee, editData);
      
      const updated = await workflowStoreAPI.getContingent();
      setContingent(updated);
      
      setEditingEmployee(null);
      setEditData({});
      setShowEditModal(false);
      setShowEditHarmfulFactorsDropdown(false);
      setEditHarmfulFactorsSearch('');
      setEditAttempted(false);
      showToast('✅ Изменения успешно сохранены', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка сохранения', 'error');
    }
  };

  const handleCancelEditEmployee = () => {
    setEditingEmployee(null);
    setEditData({});
    setShowEditModal(false);
    setShowEditHarmfulFactorsDropdown(false);
    setEditHarmfulFactorsSearch('');
    setEditAttempted(false);
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

  const handleCreateEmployee = async () => {
    if (!selectedContractForUpload) return;
    
    setCreateAttempted(true);
    
    const missingFields = [];
    if (!createData.name?.trim()) missingFields.push('ФИО');
    if (!createData.department?.trim()) missingFields.push('Объект/участок');
    if (!createData.position?.trim()) missingFields.push('Должность');
    if (!createData.birthDate) missingFields.push('Дата рождения');
    if (!createData.gender) missingFields.push('Пол');
    if (createData.totalExperienceYears === undefined || createData.totalExperienceYears === null) missingFields.push('Общий стаж');
    if (createData.positionExperienceYears === undefined || createData.positionExperienceYears === null) missingFields.push('Стаж по должности');

    if (!createData.harmfulFactors || createData.harmfulFactors.length === 0) {
      missingFields.push('Вредные факторы');
    }
    
    if (missingFields.length > 0) {
      showToast(`❌ Заполните обязательные поля: ${missingFields.join(', ')}`, 'error');
      return;
    }
    
    try {
      await workflowStoreAPI.createContingentEmployee({
        ...createData,
        contractId: selectedContractForUpload,
      });
      
      const updated = await workflowStoreAPI.getContingent();
      setContingent(updated);
      
      setShowCreateModal(false);
      setCreateData({});
      setShowCreateHarmfulFactorsDropdown(false);
      setCreateHarmfulFactorsSearch('');
      setCreateAttempted(false);
      showToast('✅ Сотрудник успешно добавлен', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка создания сотрудника', 'error');
    }
  };

  const handleCancelCreate = () => {
    setShowCreateModal(false);
    setCreateData({});
    setShowCreateHarmfulFactorsDropdown(false);
    setCreateHarmfulFactorsSearch('');
    setCreateAttempted(false);
  };

  const loadRouteSheetsForContract = async (contractId: string) => {
    try {
      const allSheets = await workflowStoreAPI.getRouteSheets();
      
      // Находим все календарные планы для этого договора
      const contractPlans = calendarPlans.filter(plan => plan.contractId === contractId);
      
      // Собираем ID всех сотрудников из календарных планов договора
      const planEmployeeIds = new Set<string>();
      contractPlans.forEach(plan => {
        if (plan.employeeIds && Array.isArray(plan.employeeIds)) {
          plan.employeeIds.forEach((id: any) => {
            // Нормализуем ID к строке для сравнения
            planEmployeeIds.add(String(id));
          });
        }
      });
      
      // Также добавляем сотрудников из контингента, связанных с договором
      const contractEmployeeIds = contingent
        .filter(emp => emp.contractId === contractId)
        .map(emp => String(emp.id));
      contractEmployeeIds.forEach(id => planEmployeeIds.add(id));
      
      // Фильтруем маршрутные листы по сотрудникам из планов и контингента
      // Нормализуем patientId к строке для сравнения
      const contractSheets = allSheets.filter(rs => {
        const patientIdStr = String(rs.patientId);
        return planEmployeeIds.has(patientIdStr) || contractEmployeeIds.includes(patientIdStr);
      });
      
      console.log('Route sheets filter debug:', {
        contractId,
        allSheetsCount: allSheets.length,
        contractPlansCount: contractPlans.length,
        planEmployeeIds: Array.from(planEmployeeIds),
        contractEmployeeIds,
        filteredSheetsCount: contractSheets.length,
        samplePatientIds: allSheets.slice(0, 5).map(rs => rs.patientId)
      });
      
      setRouteSheets(contractSheets);
    } catch (error) {
      console.error('Error loading route sheets:', error);
    }
  };

  useEffect(() => {
    if (showContractDrawer && activeTab === 'route') {
      loadRouteSheetsForContract(showContractDrawer);
    }
  }, [showContractDrawer, activeTab, contingent, calendarPlans]);

  const getPlanStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Черновик',
      pending_clinic: 'Ожидает утверждения клиникой',
      pending_employer: 'Ожидает утверждения работодателем',
      approved: 'Утвержден',
    };
    return labels[status] || status;
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

  const getPlanStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      pending_clinic: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      pending_employer: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
                    const isExpanded = selectedContract?.id === contract.id || showRejectForm === contract.id;
                    
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
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenContractPage(contract.id)}
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
                                        {/* Информация об исполнении */}
                                        {contract.executed_by_clinic_at && (
                                          <>
                                            <div>
                                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Отмечено клиникой как исполненное</p>
                                              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                                {new Date(contract.executed_by_clinic_at).toLocaleString('ru-RU')}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Тип исполнения</p>
                                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {contract.execution_type === 'full' ? '✅ Полное исполнение' : '⚠️ Частичное исполнение'}
                                              </p>
                                            </div>
                                            {contract.execution_notes && (
                                              <div className="col-span-full">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Примечания клиники к исполнению</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                                                  {contract.execution_notes}
                                                </p>
                                              </div>
                                            )}
                                          </>
                                        )}
                                        {contract.confirmed_by_employer_at && (
                                          <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Подтверждено работодателем</p>
                                            <p className="text-sm font-medium text-green-600 dark:text-green-400">
                                              {new Date(contract.confirmed_by_employer_at).toLocaleString('ru-RU')}
                                            </p>
                                          </div>
                                        )}
                                        {contract.employer_rejection_reason && (
                                          <div className="col-span-full">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Причина отклонения исполнения</p>
                                            <p className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                                              {contract.employer_rejection_reason}
                                            </p>
                                          </div>
                                        )}
                                        {contract.notes && (
                                          <div className="col-span-full">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Примечания к договору</p>
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
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Контингент договора</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {contractContingent.length} сотрудников
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setSelectedContractForUpload(showContractDrawer);
                            setShowCreateModal(true);
                          }}
                        >
                          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Добавить сотрудника
                        </Button>
                        <Button onClick={() => handleUploadContingent(showContractDrawer)}>
                          <Upload className="h-4 w-4 mr-2" />
                          Загрузить контингент
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
                      <>
                        {/* Фильтры для контингента */}
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
                                  Найдено: {getFilteredContingent(showContractDrawer).length} из {contractContingent.length}
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
                                  <th className="px-3 py-2 text-right">Действия</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {getFilteredContingent(showContractDrawer).map((emp) => (
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
                                  <td className="px-3 py-2 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEditEmployee(emp)}
                                      >
                                        <Edit2 className="h-4 w-4" />
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
                                      <div className="flex items-center gap-2 justify-end">
                                        {plan.status === 'pending_employer' && (
                                          <>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => {
                                                setRejectPlanReason('');
                                                setShowRejectPlanModal(plan.id);
                                              }}
                                              className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                                            >
                                              <XCircle className="h-4 w-4 mr-1" />
                                              Отклонить
                                            </Button>
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
                                          </>
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
                                            <div className="space-y-3 max-h-[600px] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                              {plan.departmentsInfo.map((dept: any, idx: number) => {
                                                const startDateObj = dept.startDate ? new Date(dept.startDate) : null;
                                                const endDateObj = dept.endDate ? new Date(dept.endDate) : null;
                                                const isValidStartDate = startDateObj && !isNaN(startDateObj.getTime());
                                                const isValidEndDate = endDateObj && !isNaN(endDateObj.getTime());
                                                const employeeIds = dept.employeeIds || [];
                                                const deptKey = `${plan.id}-${idx}`;
                                                const isExpanded = expandedDepartment === deptKey;
                                                const employees = getEmployeesByIds(employeeIds);
                                                
                                                // Поиск и пагинация
                                                const searchQuery = departmentEmployeeSearch[deptKey] || '';
                                                const filteredEmployees = employees.filter(emp => 
                                                  emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                  emp.iin.includes(searchQuery) ||
                                                  emp.position.toLowerCase().includes(searchQuery.toLowerCase())
                                                );
                                                const currentPage = departmentEmployeePage[deptKey] || 1;
                                                const itemsPerPage = 20;
                                                const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
                                                const startIdx = (currentPage - 1) * itemsPerPage;
                                                const paginatedEmployees = filteredEmployees.slice(startIdx, startIdx + itemsPerPage);
                                                
                                                return (
                                                  <div key={idx} className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                                    <div className="flex items-center justify-between mb-2">
                                                      <div className="flex-1">
                                                        <p className="font-medium text-sm">{dept.department}</p>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                                          {isValidStartDate && isValidEndDate
                                                            ? `${startDateObj.toLocaleDateString('ru-RU')} - ${endDateObj.toLocaleDateString('ru-RU')}`
                                                            : dept.startDate && dept.endDate
                                                            ? `${dept.startDate} - ${dept.endDate}`
                                                            : 'Даты не указаны'}
                                                        </p>
                                                      </div>
                                                      <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setExpandedDepartment(isExpanded ? null : deptKey)}
                                                        className="ml-2"
                                                      >
                                                        {isExpanded ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
                                                        Сотрудников: {employeeIds.length}
                                                      </Button>
                                                    </div>
                                                    
                                                    {isExpanded && (
                                                      <div className="mt-3 space-y-2">
                                                        {/* Поиск */}
                                                        {employeeIds.length > 10 && (
                                                          <div className="flex items-center gap-2">
                                                            <Input
                                                              type="text"
                                                              placeholder="Поиск по ФИО, ИИН, должности..."
                                                              value={searchQuery}
                                                              onChange={(e) => {
                                                                setDepartmentEmployeeSearch({
                                                                  ...departmentEmployeeSearch,
                                                                  [deptKey]: e.target.value
                                                                });
                                                                setDepartmentEmployeePage({
                                                                  ...departmentEmployeePage,
                                                                  [deptKey]: 1
                                                                });
                                                              }}
                                                              className="flex-1"
                                                            />
                                                            {searchQuery && (
                                                              <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                  setDepartmentEmployeeSearch({
                                                                    ...departmentEmployeeSearch,
                                                                    [deptKey]: ''
                                                                  });
                                                                }}
                                                              >
                                                                <X className="h-4 w-4" />
                                                              </Button>
                                                            )}
                                                          </div>
                                                        )}
                                                        
                                                        {/* Список сотрудников */}
                                                        {paginatedEmployees.length > 0 ? (
                                                          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                                            <table className="w-full text-xs">
                                                              <thead className="bg-gray-100 dark:bg-gray-800">
                                                                <tr>
                                                                  <th className="px-2 py-2 text-left">ФИО</th>
                                                                  <th className="px-2 py-2 text-left">ИИН</th>
                                                                  <th className="px-2 py-2 text-left">Должность</th>
                                                                  <th className="px-2 py-2 text-left">Дата рождения</th>
                                                                </tr>
                                                              </thead>
                                                              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                                {paginatedEmployees.map((emp) => (
                                                                  <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                                    <td className="px-2 py-2">{emp.name}</td>
                                                                    <td className="px-2 py-2">{emp.iin}</td>
                                                                    <td className="px-2 py-2">{emp.position}</td>
                                                                    <td className="px-2 py-2">{emp.birthDate}</td>
                                                                  </tr>
                                                                ))}
                                                              </tbody>
                                                            </table>
                                                          </div>
                                                        ) : (
                                                          <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
                                                            {searchQuery ? 'Сотрудники не найдены' : 'Нет сотрудников'}
                                                          </p>
                                                        )}
                                                        
                                                        {/* Пагинация */}
                                                        {totalPages > 1 && (
                                                          <div className="flex items-center justify-between pt-2">
                                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                              Показано {startIdx + 1}-{Math.min(startIdx + itemsPerPage, filteredEmployees.length)} из {filteredEmployees.length}
                                                            </p>
                                                            <div className="flex items-center gap-1">
                                                              <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                  setDepartmentEmployeePage({
                                                                    ...departmentEmployeePage,
                                                                    [deptKey]: Math.max(1, currentPage - 1)
                                                                  });
                                                                }}
                                                                disabled={currentPage === 1}
                                                              >
                                                                <ChevronLeft className="h-3 w-3" />
                                                              </Button>
                                                              <span className="text-xs px-2">
                                                                {currentPage} / {totalPages}
                                                              </span>
                                                              <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                  setDepartmentEmployeePage({
                                                                    ...departmentEmployeePage,
                                                                    [deptKey]: Math.min(totalPages, currentPage + 1)
                                                                  });
                                                                }}
                                                                disabled={currentPage === totalPages}
                                                              >
                                                                <ChevronRight className="h-3 w-3" />
                                                              </Button>
                                                            </div>
                                                          </div>
                                                        )}
                                                      </div>
                                                    )}
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

      {/* Модальное окно загрузки контингента */}
      {showUploadModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowUploadModal(null)}
          title="Загрузить контингент"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Загрузите Excel-файл со списком сотрудников. Система автоматически присвоит вредные факторы.
            </p>
            <div className="flex items-center gap-3">
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
              <label className="cursor-pointer flex-1">
                <Button
                  type="button"
                  variant="primary"
                  disabled={isUploading}
                  className="w-full"
                  onClick={(e) => {
                    e.preventDefault();
                    const input = document.getElementById(`file-upload-modal-${showUploadModal}`) as HTMLInputElement;
                    input?.click();
                  }}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'Загрузка...' : 'Выбрать файл'}
                </Button>
                <input
                  id={`file-upload-modal-${showUploadModal}`}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    handleFileUpload(e, showUploadModal);
                    setShowUploadModal(null);
                  }}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>
        </Modal>
      )}

      {/* Модальное окно создания сотрудника - копия из клиники */}
      <Modal
        isOpen={showCreateModal}
        onClose={handleCancelCreate}
        title="Добавить сотрудника"
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
          <Input
            label="ФИО *"
            value={createData.name || ''}
            onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
            placeholder="Иванов Иван Иванович"
            className={createAttempted && !createData.name ? 'border-red-500' : ''}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Объект/участок *"
              value={createData.department || ''}
              onChange={(e) => setCreateData({ ...createData, department: e.target.value })}
              placeholder="Участок №1"
              className={createAttempted && !createData.department ? 'border-red-500' : ''}
            />
            <Input
              label="Должность *"
              value={createData.position || ''}
              onChange={(e) => setCreateData({ ...createData, position: e.target.value })}
              placeholder="Оператор"
              className={createAttempted && !createData.position ? 'border-red-500' : ''}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Дата рождения *"
              type="date"
              value={createData.birthDate || ''}
              onChange={(e) => setCreateData({ ...createData, birthDate: e.target.value })}
              className={createAttempted && !createData.birthDate ? 'border-red-500' : ''}
            />
            <div>
              <label className="block text-sm font-medium mb-1">Пол *</label>
              <select
                value={createData.gender || ''}
                onChange={(e) => setCreateData({ ...createData, gender: e.target.value as 'male' | 'female' })}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${createAttempted && !createData.gender ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Не указан</option>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
              </select>
            </div>
          </div>
          <Input
            label="Телефон"
            value={createData.phone || ''}
            onChange={(e) => setCreateData({ ...createData, phone: e.target.value })}
            placeholder="77001234567"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Общий стаж (лет) *"
              type="number"
              value={createData.totalExperienceYears !== undefined ? createData.totalExperienceYears : ''}
              onChange={(e) => setCreateData({ ...createData, totalExperienceYears: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="20"
              min="0"
              className={createAttempted && (createData.totalExperienceYears === undefined || createData.totalExperienceYears === null) ? 'border-red-500' : ''}
            />
            <Input
              label="Стаж по должности (лет) *"
              type="number"
              value={createData.positionExperienceYears !== undefined ? createData.positionExperienceYears : ''}
              onChange={(e) => setCreateData({ ...createData, positionExperienceYears: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="15"
              min="0"
              className={createAttempted && (createData.positionExperienceYears === undefined || createData.positionExperienceYears === null) ? 'border-red-500' : ''}
            />
          </div>
          <Input
            label="Дата последнего медосмотра"
            type="date"
            value={createData.lastExaminationDate || ''}
            onChange={(e) => setCreateData({ ...createData, lastExaminationDate: e.target.value })}
          />
          <div className="relative">
            <label className="block text-sm font-medium mb-1">Профессиональная вредность *</label>
            <div className="relative">
              <Input
                value={createData.harmfulFactors?.[0] || ''}
                onChange={(e) => setCreateHarmfulFactorsSearch(e.target.value)}
                onFocus={() => setShowCreateHarmfulFactorsDropdown(true)}
                placeholder="Выберите вредный фактор"
                className={createAttempted && (!createData.harmfulFactors || createData.harmfulFactors.length === 0) ? 'border-red-500' : ''}
              />
            </div>
            {showCreateHarmfulFactorsDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {HARMFUL_FACTORS_OPTIONS
                  .filter(factor => factor.toLowerCase().includes(createHarmfulFactorsSearch.toLowerCase()))
                  .map((factor, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setCreateData({ ...createData, harmfulFactors: [factor] });
                        setShowCreateHarmfulFactorsDropdown(false);
                        setCreateHarmfulFactorsSearch('');
                      }}
                      className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm ${
                        createData.harmfulFactors?.[0] === factor ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      {factor}
                    </div>
                  ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Примечание</label>
            <textarea
              value={createData.notes || ''}
              onChange={(e) => setCreateData({ ...createData, notes: e.target.value })}
              placeholder="Дополнительная информация"
              className="w-full px-3 py-2 border rounded-lg min-h-[60px] text-sm"
              maxLength={1000}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={handleCancelCreate}>Отмена</Button>
          <Button variant="primary" onClick={handleCreateEmployee}>Сохранить</Button>
        </div>
      </Modal>

      {/* Модальное окно редактирования сотрудника - копия из клиники */}
      <Modal
        isOpen={showEditModal}
        onClose={handleCancelEditEmployee}
        title="Редактировать сотрудника"
        size="lg"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
          <Input
            label="ФИО *"
            value={editData.name || ''}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            placeholder="Иванов Иван Иванович"
            className={editAttempted && !editData.name ? 'border-red-500' : ''}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Объект/участок *"
              value={editData.department || ''}
              onChange={(e) => setEditData({ ...editData, department: e.target.value })}
              placeholder="Участок №1"
              className={editAttempted && !editData.department ? 'border-red-500' : ''}
            />
            <Input
              label="Должность *"
              value={editData.position || ''}
              onChange={(e) => setEditData({ ...editData, position: e.target.value })}
              placeholder="Оператор"
              className={editAttempted && !editData.position ? 'border-red-500' : ''}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Дата рождения *"
              type="date"
              value={editData.birthDate ? new Date(editData.birthDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setEditData({ ...editData, birthDate: e.target.value })}
              className={editAttempted && !editData.birthDate ? 'border-red-500' : ''}
            />
            <div>
              <label className="block text-sm font-medium mb-1">Пол *</label>
              <select
                value={editData.gender || ''}
                onChange={(e) => setEditData({ ...editData, gender: e.target.value as 'male' | 'female' })}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${editAttempted && !editData.gender ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Не указан</option>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
              </select>
            </div>
          </div>
          <Input
            label="Телефон"
            value={editData.phone || ''}
            onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
            placeholder="77001234567"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Общий стаж (лет) *"
              type="number"
              value={editData.totalExperienceYears !== undefined ? editData.totalExperienceYears : ''}
              onChange={(e) => setEditData({ ...editData, totalExperienceYears: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="20"
              min="0"
              className={editAttempted && (editData.totalExperienceYears === undefined || editData.totalExperienceYears === null) ? 'border-red-500' : ''}
            />
            <Input
              label="Стаж по должности (лет) *"
              type="number"
              value={editData.positionExperienceYears !== undefined ? editData.positionExperienceYears : ''}
              onChange={(e) => setEditData({ ...editData, positionExperienceYears: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="15"
              min="0"
              className={editAttempted && (editData.positionExperienceYears === undefined || editData.positionExperienceYears === null) ? 'border-red-500' : ''}
            />
          </div>
          <Input
            label="Дата последнего медосмотра"
            type="date"
            value={editData.lastExaminationDate ? new Date(editData.lastExaminationDate).toISOString().split('T')[0] : ''}
            onChange={(e) => setEditData({ ...editData, lastExaminationDate: e.target.value })}
          />
          <div className="relative">
            <label className="block text-sm font-medium mb-1">Профессиональная вредность *</label>
            <div className="relative">
              <Input
                value={editData.harmfulFactors?.[0] || ''}
                onChange={(e) => setEditHarmfulFactorsSearch(e.target.value)}
                onFocus={() => setShowEditHarmfulFactorsDropdown(true)}
                placeholder="Выберите вредный фактор"
                className={editAttempted && (!editData.harmfulFactors || editData.harmfulFactors.length === 0) ? 'border-red-500' : ''}
              />
            </div>
            {showEditHarmfulFactorsDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {HARMFUL_FACTORS_OPTIONS
                  .filter(factor => factor.toLowerCase().includes(editHarmfulFactorsSearch.toLowerCase()))
                  .map((factor, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setEditData({ ...editData, harmfulFactors: [factor] });
                        setShowEditHarmfulFactorsDropdown(false);
                        setEditHarmfulFactorsSearch('');
                      }}
                      className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm ${
                        editData.harmfulFactors?.[0] === factor ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      {factor}
                    </div>
                  ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Примечание</label>
            <textarea
              value={editData.notes || ''}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              placeholder="Дополнительная информация"
              className="w-full px-3 py-2 border rounded-lg min-h-[60px] text-sm"
              maxLength={1000}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={handleCancelEditEmployee}>Отмена</Button>
          <Button variant="primary" onClick={handleSaveEmployee}>Сохранить изменения</Button>
        </div>
      </Modal>

      {/* Модальное окно для отклонения календарного плана */}
      <Modal
        isOpen={showRejectPlanModal !== null}
        onClose={() => {
          setShowRejectPlanModal(null);
          setRejectPlanReason('');
        }}
        title="Отклонение календарного плана"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Укажите причину отклонения календарного плана. Клиника получит уведомление с указанной причиной.
          </p>
          <div>
            <label className="block text-sm font-medium mb-1">Причина отклонения *</label>
            <textarea
              value={rejectPlanReason}
              onChange={(e) => setRejectPlanReason(e.target.value)}
              placeholder="Например: Сотрудник уволился, даты не подходят, требуется изменение списка сотрудников и т.д."
              className="w-full px-3 py-2 border rounded-lg min-h-[120px] text-sm"
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 mt-1">
              {rejectPlanReason.length}/1000 символов
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectPlanModal(null);
                setRejectPlanReason('');
              }}
            >
              Отмена
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (showRejectPlanModal) {
                  handleRejectPlan(showRejectPlanModal);
                }
              }}
              disabled={!rejectPlanReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Отклонить план
            </Button>
          </div>
        </div>
      </Modal>
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
