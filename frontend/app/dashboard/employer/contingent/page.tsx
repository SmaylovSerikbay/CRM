'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Upload, FileSpreadsheet, CheckCircle, ArrowRight, Download, Edit2, Trash2, X, Save, QrCode, Filter, List, Grid, ChevronDown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { workflowStoreAPI, ContingentEmployee } from '@/lib/store/workflow-store-api';
import { userStore } from '@/lib/store/user-store';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

// Список стандартных вредных факторов согласно приказу № ҚР ДСМ-131/2020
const HARMFUL_FACTORS_OPTIONS = [
  'п.1 «Работы, связанные с воздействием химических факторов»',
  'п.2 «Работы с канцерогенными веществами»',
  'п.3 «Работы с пестицидами и агрохимикатами»',
  'п.4 «Работы, связанные с воздействием биологических факторов»',
  'п.5 «Работы, выполняемые в условиях повышенного шума»',
  'п.6 «Работы, выполняемые в условиях вибрации»',
  'п.7 «Работы, выполняемые в условиях ионизирующего излучения»',
  'п.8 «Работы, выполняемые в условиях неионизирующих излучений»',
  'п.9 «Работы, выполняемые при повышенной или пониженной температуре воздуха»',
  'п.10 «Работы в замкнутых пространствах»',
  'п.11 «Работы на высоте»',
  'п.12 «Работы, связанные с подъемом и перемещением тяжестей»',
  'п.13 «Работы в ночное время»',
  'п.14 «Работа на ПК»',
  'п.15 «Работы, связанные с эмоциональным и умственным перенапряжением»',
  'п.16 «Работы, связанные с повышенной ответственностью»',
  'п.17 «Работы вахтовым методом»',
  'п.18 «Подземные работы»',
  'п.19 «Работы на транспорте»',
  'п.20 «Работы, связанные с воздействием пыли»',
  'п.21 «Работы с горюче-смазочными материалами»',
  'п.22 «Работы, связанные с воздействием нефти и нефтепродуктов»',
  'п.23 «Работы в условиях повышенной загазованности»',
  'п.24 «Работы в условиях недостатка кислорода»',
  'п.25 «Работы в условиях повышенной влажности»',
  'п.26 «Работы, связанные с виброинструментом»',
  'п.27 «Работы на конвейерах»',
  'п.28 «Работы на строительных площадках»',
  'п.29 «Работы в металлургическом производстве»',
  'п.30 «Работы в горнодобывающей промышленности»',
  'п.31 «Работы в деревообрабатывающем производстве»',
  'п.32 «Работы в текстильной и швейной промышленности»',
  'п.33 «Профессии и работы»',
];

export default function ContingentPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [employees, setEmployees] = useState<ContingentEmployee[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [filterContractId, setFilterContractId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [qrCodeModal, setQrCodeModal] = useState<{ employeeId: string; qrUrl: string } | null>(null);
  
  // Модальное окно для создания нового сотрудника
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState<Partial<ContingentEmployee>>({});
  const [showCreateHarmfulFactorsDropdown, setShowCreateHarmfulFactorsDropdown] = useState(false);
  const [createHarmfulFactorsSearch, setCreateHarmfulFactorsSearch] = useState('');
  const [createAttempted, setCreateAttempted] = useState(false);
  
  // Модальное окно для редактирования сотрудника
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ContingentEmployee>>({});
  const [showEditHarmfulFactorsDropdown, setShowEditHarmfulFactorsDropdown] = useState(false);
  const [editHarmfulFactorsSearch, setEditHarmfulFactorsSearch] = useState('');
  const [editAttempted, setEditAttempted] = useState(false);
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Загружаем договоры
        const contractsData = await workflowStoreAPI.getContracts();
        // Включаем как утвержденные, так и исполненные договоры
        const approvedContracts = contractsData.filter((c: any) => c.status === 'approved' || c.status === 'executed');
        setContracts(approvedContracts);
        
        // Если есть только один договор, выбираем его автоматически
        if (approvedContracts.length === 1) {
          setSelectedContractId(approvedContracts[0].id);
        }
        
        // Загружаем контингент
        const data = await workflowStoreAPI.getContingent();
        setEmployees(data);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!selectedContractId) {
      showToast('Пожалуйста, выберите договор перед загрузкой контингента', 'warning');
      return;
    }
    
    setIsUploading(true);
    setUploadSuccess(false);

    try {
      const result = await workflowStoreAPI.uploadExcelContingent(file, selectedContractId);
      
      const updated = await workflowStoreAPI.getContingent();
      setEmployees(updated);
      setUploadSuccess(true);
      
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
    } catch (error: any) {
      console.error('Upload error:', error);
      // Показываем ошибку с деталями
      const errorMessage = error.message || 'Ошибка загрузки файла';
      showToast(errorMessage, 'error');
      // Также показываем alert для важных ошибок валидации
      if (errorMessage.includes('не соответствует шаблону')) {
        alert(errorMessage);
      }
    } finally {
      setIsUploading(false);
      // Сбрасываем input, чтобы можно было загрузить тот же файл снова
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого сотрудника?')) return;
    
    try {
      await workflowStoreAPI.deleteContingentEmployee(id);
      const updated = await workflowStoreAPI.getContingent();
      setEmployees(updated);
      showToast('Сотрудник успешно удален', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка удаления', 'error');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Вы уверены, что хотите удалить ВСЕХ сотрудников? Это действие нельзя отменить!')) return;
    
    try {
      await workflowStoreAPI.deleteAllContingentEmployees();
      setEmployees([]);
      setUploadSuccess(false);
      showToast('Все сотрудники удалены', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка удаления', 'error');
    }
  };

  const handleEdit = (employee: ContingentEmployee) => {
    setEditingId(employee.id);
    setEditData({
      name: employee.name,
      position: employee.position,
      department: employee.department,
      birthDate: employee.birthDate,
      gender: employee.gender,
      phone: (employee as any).phone,
      totalExperienceYears: (employee as any).totalExperienceYears,
      positionExperienceYears: (employee as any).positionExperienceYears,
      lastExaminationDate: employee.lastExaminationDate,
      harmfulFactors: employee.harmfulFactors,
      notes: (employee as any).notes,
    });
    setShowEditModal(true);
    setEditAttempted(false);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    
    setEditAttempted(true);
    
    // Валидация обязательных полей (все кроме телефона и примечания)
    const missingFields = [];
    if (!editData.name) missingFields.push('ФИО');
    if (!editData.department) missingFields.push('Объект/участок');
    if (!editData.position) missingFields.push('Должность');
    if (!editData.birthDate) missingFields.push('Дата рождения');
    if (!editData.gender) missingFields.push('Пол');
    if (editData.totalExperienceYears === undefined || editData.totalExperienceYears === null) missingFields.push('Общий стаж');
    if (editData.positionExperienceYears === undefined || editData.positionExperienceYears === null) missingFields.push('Стаж по должности');
    
    if (missingFields.length > 0) {
      showToast(`Заполните обязательные поля: ${missingFields.join(', ')}`, 'error');
      return;
    }
    
    try {
      const user = userStore.getCurrentUser();
      await workflowStoreAPI.updateContingentEmployee(user?.id || '', editingId, editData);
      
      // Обновляем список сотрудников
      const updated = await workflowStoreAPI.getContingent();
      setEmployees(updated);
      
      // Закрываем модальное окно и очищаем состояние
      setEditingId(null);
      setEditData({});
      setShowEditModal(false);
      setShowEditHarmfulFactorsDropdown(false);
      setEditHarmfulFactorsSearch('');
      setEditAttempted(false);
      
      showToast('Изменения успешно сохранены', 'success');
    } catch (error: any) {
      console.error('Error saving employee:', error);
      showToast(error.message || 'Ошибка сохранения', 'error');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
    setShowEditModal(false);
    setShowEditHarmfulFactorsDropdown(false);
    setEditHarmfulFactorsSearch('');
    setEditAttempted(false);
  };

  const handleCreateEmployee = async () => {
    console.log('=== handleCreateEmployee called ===');
    console.log('createData:', createData);
    console.log('selectedContractId:', selectedContractId);
    
    setCreateAttempted(true);
    
    // Валидация обязательных полей (все кроме телефона и примечания)
    const missingFields = [];
    if (!createData.name) missingFields.push('ФИО');
    if (!createData.department) missingFields.push('Объект/участок');
    if (!createData.position) missingFields.push('Должность');
    if (!createData.birthDate) missingFields.push('Дата рождения');
    if (!createData.gender) missingFields.push('Пол');
    if (!createData.totalExperienceYears && createData.totalExperienceYears !== 0) missingFields.push('Общий стаж');
    if (!createData.positionExperienceYears && createData.positionExperienceYears !== 0) missingFields.push('Стаж по должности');
    if (!createData.lastExaminationDate) missingFields.push('Дата последнего медосмотра');
    if (!createData.harmfulFactors || createData.harmfulFactors.length === 0) missingFields.push('Вредные факторы');
    
    if (missingFields.length > 0) {
      console.log('Validation failed: missing required fields:', missingFields);
      showToast(`❌ Заполните обязательные поля: ${missingFields.join(', ')}`, 'error');
      return;
    }

    if (!selectedContractId) {
      console.log('Validation failed: no contract selected');
      showToast('❌ Выберите договор', 'error');
      return;
    }

    try {
      console.log('Calling API to create employee...');
      const newEmployee = await workflowStoreAPI.createContingentEmployee({
        ...createData,
        contractId: selectedContractId,
      });
      console.log('Employee created successfully:', newEmployee);
      
      // Добавляем нового сотрудника в начало списка
      setEmployees(prevEmployees => [newEmployee, ...prevEmployees]);
      
      // Закрываем модальное окно и очищаем форму
      setShowCreateModal(false);
      setCreateData({});
      setShowCreateHarmfulFactorsDropdown(false);
      setCreateHarmfulFactorsSearch('');
      setCreateAttempted(false);
      
      showToast('✅ Сотрудник успешно добавлен', 'success');
    } catch (error: any) {
      console.error('Error creating employee:', error);
      console.error('Error details:', error.message, error.stack);
      showToast(error.message || 'Ошибка создания сотрудника', 'error');
    }
  };

  const handleCancelCreate = () => {
    setShowCreateModal(false);
    setCreateData({});
    setShowCreateHarmfulFactorsDropdown(false);
    setCreateHarmfulFactorsSearch('');
    setShowHarmfulFactorsDropdown(false);
    setHarmfulFactorsSearch('');
    setCreateAttempted(false);
  };

  const handleNextStep = () => {
    router.push('/dashboard/employer/calendar-plan');
  };

  // Фильтрация и группировка
  const getFilteredEmployees = (): ContingentEmployee[] => {
    let filtered = employees;
    if (filterContractId) {
      filtered = filtered.filter(emp => emp.contractId === filterContractId);
    }
    return filtered;
  };

  const getGroupedEmployees = (): Record<string, ContingentEmployee[]> => {
    const filtered = getFilteredEmployees();
    const grouped: Record<string, ContingentEmployee[]> = {};
    
    filtered.forEach(emp => {
      const key = emp.contractId || 'no-contract';
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(emp);
    });
    
    return grouped;
  };

  const getContractInfo = (contractId?: string) => {
    if (!contractId) return null;
    return contracts.find(c => c.id === contractId);
  };

  const toggleGroup = (contractKey: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contractKey)) {
        newSet.delete(contractKey);
      } else {
        newSet.add(contractKey);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allKeys = Object.keys(getGroupedEmployees());
    setExpandedGroups(new Set(allKeys));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const filteredEmployees = getFilteredEmployees();
  const groupedEmployees = getGroupedEmployees();
  
  // Пагинация
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [filterContractId]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Sticky Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Список контингента</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Загрузите Excel-файл со списком сотрудников. Система автоматически присвоит вредные факторы.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Всего: {employees.length} | Показано: {filteredEmployees.length}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-4">
        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-6 w-6 text-green-600 dark:text-green-400" />
                <h2 className="text-xl font-semibold">Загрузка списка контингента</h2>
              </div>
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
            </div>
            
            {uploadSuccess && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <p className="text-green-700 dark:text-green-300">
                    Файл успешно загружен! Вредные факторы автоматически присвоены {employees.length} сотрудникам.
                  </p>
                </div>
                <Button onClick={handleNextStep}>
                  Перейти к календарному плану
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Выбор договора */}
            {contracts.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Выберите договор для загрузки контингента:
                </label>
                <select
                  value={selectedContractId}
                  onChange={(e) => setSelectedContractId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">-- Выберите договор --</option>
                  {contracts.map((contract: any) => (
                    <option key={contract.id} value={contract.id}>
                      Договор №{contract.contract_number} от {new Date(contract.contract_date).toLocaleDateString('ru-RU')} - {contract.clinic_name || 'Клиника'}{contract.status === 'executed' ? ' (Исполнен)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {contracts.length === 0 && !isLoading && (
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-yellow-700 dark:text-yellow-300">
                  У вас нет подтвержденных договоров. Сначала необходимо подтвердить договор с клиникой.
                </p>
              </div>
            )}

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Выберите Excel-файл или перетащите сюда
              </p>
              <div className="flex items-center justify-center gap-3">
                <label className="cursor-pointer">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploading}
                    onClick={(e) => {
                      e.preventDefault();
                      const input = document.getElementById('file-upload-input') as HTMLInputElement;
                      input?.click();
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Выбрать файл
                  </Button>
                  <input
                    id="file-upload-input"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
                <span className="text-gray-400">или</span>
                <Button
                  variant="primary"
                  onClick={() => setShowCreateModal(true)}
                  disabled={!selectedContractId || isUploading}
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Добавить сотрудника вручную
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                Поддерживаются файлы .xlsx, .xls. Формат согласно приказу №131: № п/п, ФИО, Дата рождения, Пол, Объект или участок, Занимаемая должность, Общий стаж, Стаж по занимаемой должности, Дата последнего медосмотра, Профессиональная вредность, Примечание
              </p>
              {isUploading && (
                <div className="mt-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Обработка файла...</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Employees List */}
        {employees.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card>
              {/* Фильтры и управление */}
              <div className="mb-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold">
                      Список сотрудников ({filteredEmployees.length} из {employees.length})
                    </h3>
                    {filterContractId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilterContractId('')}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Сбросить фильтр
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {viewMode === 'grouped' && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={expandAll}
                        >
                          Раскрыть все
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={collapseAll}
                        >
                          Свернуть все
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-700 rounded-lg p-1">
                      <button
                        onClick={() => setViewMode('grouped')}
                        className={`px-3 py-1.5 text-sm rounded transition-colors ${
                          viewMode === 'grouped'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <Grid className="h-4 w-4 inline mr-1" />
                        По договорам
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1.5 text-sm rounded transition-colors ${
                          viewMode === 'list'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <List className="h-4 w-4 inline mr-1" />
                        Список
                      </button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteAll}
                      className="text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Удалить всех
                    </Button>
                  </div>
                </div>

                {/* Фильтр по договору */}
                <div className="flex items-center gap-3">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select
                    value={filterContractId}
                    onChange={(e) => setFilterContractId(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="">Все договоры</option>
                    {contracts.map((contract: any) => {
                      const count = employees.filter(emp => emp.contractId === contract.id).length;
                      return (
                        <option key={contract.id} value={contract.id}>
                          Договор №{contract.contract_number}{contract.status === 'executed' ? ' (Исполнен)' : ''} ({count} сотрудников)
                        </option>
                      );
                    })}
                    <option value="no-contract">Без договора ({employees.filter(emp => !emp.contractId).length} сотрудников)</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                    <tr className="border-b-2 border-gray-300 dark:border-gray-700">
                      <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">№</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">Договор</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">ФИО</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">Дата рожд.</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">Пол</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">Объект/участок</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">Должность</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">Общий стаж</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">Стаж по должности</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">Последний осмотр</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">Вредность</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">Примечание</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewMode === 'list' ? (
                      // Режим списка
                      paginatedEmployees.map((employee, index) => (
                        <tr
                          key={employee.id}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          {editingId === employee.id ? (
                            <>
                              <td className="py-2 px-2">{index + 1}</td>
                              <td className="py-2 px-2">
                                {employee.contractNumber ? (
                                  <div className="text-xs">
                                    <div className="font-medium text-blue-600 dark:text-blue-400">№{employee.contractNumber}</div>
                                    {employee.employerName && (
                                      <div className="text-gray-500 dark:text-gray-400">{employee.employerName}</div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={editData.name || ''}
                                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                  className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-800"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="date"
                                  value={editData.birthDate ? new Date(editData.birthDate).toISOString().split('T')[0] : ''}
                                  onChange={(e) => setEditData({ ...editData, birthDate: e.target.value })}
                                  className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-800"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <select
                                  value={editData.gender || ''}
                                  onChange={(e) => setEditData({ ...editData, gender: e.target.value as 'male' | 'female' })}
                                  className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-800"
                                >
                                  <option value="">-</option>
                                  <option value="male">мужской</option>
                                  <option value="female">женский</option>
                                </select>
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={editData.department || ''}
                                  onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                                  className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-800"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={editData.position || ''}
                                  onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                                  className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-800"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="number"
                                  value={editData.totalExperienceYears || ''}
                                  onChange={(e) => setEditData({ ...editData, totalExperienceYears: parseInt(e.target.value) || 0 })}
                                  className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-800"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="number"
                                  value={editData.positionExperienceYears || ''}
                                  onChange={(e) => setEditData({ ...editData, positionExperienceYears: parseInt(e.target.value) || 0 })}
                                  className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-800"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="date"
                                  value={editData.lastExaminationDate ? new Date(editData.lastExaminationDate).toISOString().split('T')[0] : ''}
                                  onChange={(e) => setEditData({ ...editData, lastExaminationDate: e.target.value })}
                                  className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-800"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <div className="relative">
                                  <div
                                    className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-800 cursor-pointer min-h-[32px] flex items-center justify-between"
                                    onClick={() => setShowHarmfulFactorsDropdown(!showHarmfulFactorsDropdown)}
                                  >
                                    <span className="text-gray-700 dark:text-gray-300 truncate">
                                      {Array.isArray(editData.harmfulFactors) && editData.harmfulFactors.length > 0
                                        ? editData.harmfulFactors[0]
                                        : 'Выберите вредный фактор'}
                                    </span>
                                    <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0 ml-2" />
                                  </div>
                                  {showHarmfulFactorsDropdown && (
                                    <div className="absolute z-50 mt-1 w-full max-w-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-hidden">
                                      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                                        <input
                                          type="text"
                                          placeholder="Поиск..."
                                          value={harmfulFactorsSearch}
                                          onChange={(e) => setHarmfulFactorsSearch(e.target.value)}
                                          className="w-full px-3 py-2 text-sm border rounded dark:bg-gray-900 dark:border-gray-600"
                                          onClick={(e) => e.stopPropagation()}
                                          autoFocus
                                        />
                                      </div>
                                      <div className="overflow-y-auto max-h-80">
                                        {HARMFUL_FACTORS_OPTIONS.filter(factor =>
                                          factor.toLowerCase().includes(harmfulFactorsSearch.toLowerCase())
                                        ).map((factor) => {
                                          const isSelected = Array.isArray(editData.harmfulFactors) && editData.harmfulFactors.includes(factor);
                                          return (
                                            <div
                                              key={factor}
                                              className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-xs ${
                                                isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                                              }`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditData({ ...editData, harmfulFactors: [factor] });
                                                setShowHarmfulFactorsDropdown(false);
                                                setHarmfulFactorsSearch('');
                                              }}
                                            >
                                              {factor}
                                            </div>
                                          );
                                        })}
                                        {HARMFUL_FACTORS_OPTIONS.filter(factor =>
                                          factor.toLowerCase().includes(harmfulFactorsSearch.toLowerCase())
                                        ).length === 0 && (
                                          <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                            Ничего не найдено
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={editData.notes || ''}
                                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                                  className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-800"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <div className="flex gap-1">
                                  <button
                                    onClick={handleSaveEdit}
                                    className="p-1 text-green-600 hover:text-green-700"
                                    title="Сохранить"
                                  >
                                    <Save className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="p-1 text-gray-600 hover:text-gray-700"
                                    title="Отмена"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-1.5 px-2">{startIndex + index + 1}</td>
                              <td className="py-2 px-2">
                                {employee.contractNumber ? (
                                  <div className="text-xs">
                                    <div className="font-medium text-blue-600 dark:text-blue-400">№{employee.contractNumber}</div>
                                    {employee.employerName && (
                                      <div className="text-gray-500 dark:text-gray-400">{employee.employerName}</div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </td>
                              <td className="py-2 px-2 font-medium">{employee.name}</td>
                              <td className="py-2 px-2">{employee.birthDate ? new Date(employee.birthDate).toLocaleDateString('ru-RU') : '-'}</td>
                              <td className="py-2 px-2">{employee.gender === 'male' ? 'мужской' : employee.gender === 'female' ? 'женский' : '-'}</td>
                              <td className="py-2 px-2">{employee.department}</td>
                              <td className="py-2 px-2">{employee.position}</td>
                              <td className="py-2 px-2">{(employee as any).totalExperienceYears ? `${(employee as any).totalExperienceYears} лет` : '-'}</td>
                              <td className="py-2 px-2">{(employee as any).positionExperienceYears ? `${(employee as any).positionExperienceYears} лет` : '-'}</td>
                              <td className="py-2 px-2">{employee.lastExaminationDate ? new Date(employee.lastExaminationDate).toLocaleDateString('ru-RU') : '-'}</td>
                              <td className="py-2 px-2">
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {employee.harmfulFactors.length > 0 ? (
                                    employee.harmfulFactors.map((factor, idx) => (
                                      <span
                                        key={idx}
                                        className="px-1.5 py-0.5 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded"
                                        title={factor}
                                      >
                                        {factor.length > 25 ? factor.substring(0, 25) + '...' : factor}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-2 text-xs">{(employee as any).notes || '-'}</td>
                              <td className="py-2 px-2">
                                <div className="flex gap-1">
                                  <button
                                    onClick={async () => {
                                      try {
                                        const qrUrl = await workflowStoreAPI.generateEmployeeQRCode(employee.id);
                                        setQrCodeModal({ employeeId: employee.id, qrUrl });
                                      } catch (error) {
                                        console.error('Error generating QR code:', error);
                                        showToast('Ошибка при генерации QR-кода', 'error');
                                      }
                                    }}
                                    className="p-1 text-green-600 hover:text-green-700"
                                    title="Сгенерировать QR-код"
                                  >
                                    <QrCode className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleEdit(employee)}
                                    className="p-1 text-blue-600 hover:text-blue-700"
                                    title="Редактировать"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(employee.id)}
                                    className="p-1 text-red-600 hover:text-red-700"
                                    title="Удалить"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    ) : (
                      // Режим группировки по договорам
                      Object.entries(groupedEmployees).slice(startIndex, endIndex).map(([contractKey, contractEmployees]) => {
                        const contract = contractKey !== 'no-contract' ? getContractInfo(contractKey) : null;
                        return (
                          <React.Fragment key={contractKey}>
                            {/* Заголовок группы */}
                            <tr className="bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-200 dark:border-blue-800">
                              <td colSpan={13} className="py-3 px-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    <button
                                      onClick={() => toggleGroup(contractKey)}
                                      className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
                                      title={expandedGroups.has(contractKey) ? 'Свернуть' : 'Раскрыть'}
                                    >
                                      {expandedGroups.has(contractKey) ? (
                                        <ChevronDown className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                      ) : (
                                        <ChevronRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                      )}
                                    </button>
                                    <div className="w-8 h-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">{contractEmployees.length}</span>
                                    </div>
                                    <div>
                                      {contract ? (
                                        <>
                                          <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            <span>Договор №{contract.contract_number} от {new Date(contract.contract_date).toLocaleDateString('ru-RU')}</span>
                                            {contract.status === 'executed' && (
                                              <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded">
                                                Исполнен
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-sm text-gray-600 dark:text-gray-400">
                                            {contract.clinic_name || 'Клиника'}
                                          </div>
                                        </>
                                      ) : (
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                          Без договора
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {contractEmployees.length} сотрудников
                                  </div>
                                </div>
                              </td>
                            </tr>
                            {/* Сотрудники группы */}
                            {expandedGroups.has(contractKey) && contractEmployees.map((employee, empIndex) => (
                              <tr
                                key={employee.id}
                                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                              >
                                <td className="py-2 px-2">{empIndex + 1}</td>
                                <td className="py-2 px-2">
                                  {employee.contractNumber ? (
                                    <div className="text-xs">
                                      <div className="font-medium text-blue-600 dark:text-blue-400">№{employee.contractNumber}</div>
                                      {employee.employerName && (
                                        <div className="text-gray-500 dark:text-gray-400">{employee.employerName}</div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </td>
                                <td className="py-2 px-2 font-medium">{employee.name}</td>
                                <td className="py-2 px-2">{employee.birthDate ? new Date(employee.birthDate).toLocaleDateString('ru-RU') : '-'}</td>
                                <td className="py-2 px-2">{employee.gender === 'male' ? 'мужской' : employee.gender === 'female' ? 'женский' : '-'}</td>
                                <td className="py-2 px-2">{employee.department}</td>
                                <td className="py-2 px-2">{employee.position}</td>
                                <td className="py-2 px-2">{(employee as any).totalExperienceYears ? `${(employee as any).totalExperienceYears} лет` : '-'}</td>
                                <td className="py-2 px-2">{(employee as any).positionExperienceYears ? `${(employee as any).positionExperienceYears} лет` : '-'}</td>
                                <td className="py-2 px-2">{employee.lastExaminationDate ? new Date(employee.lastExaminationDate).toLocaleDateString('ru-RU') : '-'}</td>
                                <td className="py-2 px-2">
                                  <div className="flex flex-wrap gap-1 max-w-xs">
                                    {employee.harmfulFactors.length > 0 ? (
                                      employee.harmfulFactors.map((factor, idx) => (
                                        <span
                                          key={idx}
                                          className="px-1.5 py-0.5 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded"
                                          title={factor}
                                        >
                                          {factor.length > 25 ? factor.substring(0, 25) + '...' : factor}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-gray-400 text-xs">-</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-xs">{(employee as any).notes || '-'}</td>
                                <td className="py-2 px-2">
                                  <div className="flex gap-1">
                                    <button
                                      onClick={async () => {
                                        try {
                                          const qrUrl = await workflowStoreAPI.generateEmployeeQRCode(employee.id);
                                          setQrCodeModal({ employeeId: employee.id, qrUrl });
                                        } catch (error) {
                                          console.error('Error generating QR code:', error);
                                          showToast('Ошибка при генерации QR-кода', 'error');
                                        }
                                      }}
                                      className="p-1 text-green-600 hover:text-green-700"
                                      title="Сгенерировать QR-код"
                                    >
                                      <QrCode className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleEdit(employee)}
                                      className="p-1 text-blue-600 hover:text-blue-700"
                                      title="Редактировать"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(employee.id)}
                                      className="p-1 text-red-600 hover:text-red-700"
                                      title="Удалить"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Пагинация */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Страница {currentPage} из {totalPages} | Показано {startIndex + 1}-{Math.min(endIndex, filteredEmployees.length)} из {filteredEmployees.length}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">На странице:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900"
                      >
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="200">200</option>
                      </select>
                    </div>
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
                            className={`px-3 py-1 text-sm rounded ${
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
              )}
            </Card>
          </motion.div>
        )}

        {employees.length === 0 && !isUploading && (
          <Card>
            <div className="text-center py-12">
              <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Список контингента не загружен</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Загрузите Excel-файл со списком сотрудников для начала работы
              </p>
            </div>
          </Card>
        )}

        {/* Create Employee Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={handleCancelCreate}
          title="Добавить сотрудника"
          size="lg"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
            {/* ФИО */}
            <Input
              label="ФИО *"
              value={createData.name || ''}
              onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
              placeholder="Иванов Иван Иванович"
              title="👤 Введите полное ФИО сотрудника&#10;&#10;Формат: Фамилия Имя Отчество&#10;&#10;Примеры:&#10;• Иванов Иван Иванович&#10;• Петрова Мария Петровна"
              className={createAttempted && !createData.name ? 'border-red-500 dark:border-red-500' : ''}
            />

            {/* Объект/участок и Должность */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Объект/участок *"
                value={createData.department || ''}
                onChange={(e) => setCreateData({ ...createData, department: e.target.value })}
                placeholder="Участок №1"
                title="🏢 Укажите место работы сотрудника&#10;&#10;Примеры:&#10;• ТОО &quot;Компания&quot; - Отдел продаж&#10;• Производственный участок №1&#10;• Административный корпус"
                className={createAttempted && !createData.department ? 'border-red-500 dark:border-red-500' : ''}
              />
              <Input
                label="Должность *"
                value={createData.position || ''}
                onChange={(e) => setCreateData({ ...createData, position: e.target.value })}
                placeholder="Оператор"
                title="💼 Укажите должность сотрудника&#10;&#10;Примеры:&#10;• Оператор станков с ЧПУ&#10;• Главный бухгалтер&#10;• Инженер-технолог&#10;• Водитель погрузчика"
                className={createAttempted && !createData.position ? 'border-red-500 dark:border-red-500' : ''}
              />
            </div>

            {/* Дата рождения и Пол */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Дата рождения *"
                type="date"
                value={createData.birthDate || ''}
                onChange={(e) => setCreateData({ ...createData, birthDate: e.target.value })}
                title="📅 Введите дату рождения&#10;&#10;Примеры:&#10;• 29.03.1976&#10;• 15.05.1985&#10;• 01.01.1990"
                className={createAttempted && !createData.birthDate ? 'border-red-500 dark:border-red-500' : ''}
              />
              <div>
                <label className="block text-sm font-medium mb-1">Пол *</label>
                <select
                  value={createData.gender || ''}
                  onChange={(e) => setCreateData({ ...createData, gender: e.target.value as 'male' | 'female' })}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-sm ${
                    createAttempted && !createData.gender 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  title="Выберите пол сотрудника"
                >
                  <option value="">Не указан</option>
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                </select>
              </div>
            </div>

            {/* Телефон */}
            <Input
              label="Телефон"
              value={createData.phone || ''}
              onChange={(e) => setCreateData({ ...createData, phone: e.target.value })}
              placeholder="77001234567"
              title="📱 Введите номер телефона&#10;&#10;Формат: 7XXXXXXXXXX&#10;&#10;Примеры:&#10;• 77001234567&#10;• 77051234567"
            />

            {/* Стаж */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Общий стаж (лет) *"
                type="number"
                value={createData.totalExperienceYears !== undefined ? createData.totalExperienceYears : ''}
                onChange={(e) => setCreateData({ ...createData, totalExperienceYears: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="20"
                min="0"
                title="📊 Введите общий трудовой стаж в годах&#10;&#10;Только целые числа ≥ 0&#10;&#10;Примеры: 5, 10, 20, 35"
                className={createAttempted && (createData.totalExperienceYears === undefined || createData.totalExperienceYears === null) ? 'border-red-500 dark:border-red-500' : ''}
              />
              <Input
                label="Стаж по должности (лет) *"
                type="number"
                value={createData.positionExperienceYears !== undefined ? createData.positionExperienceYears : ''}
                onChange={(e) => setCreateData({ ...createData, positionExperienceYears: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="15"
                min="0"
                title="📊 Введите стаж работы по текущей должности в годах&#10;&#10;Только целые числа ≥ 0&#10;&#10;Примеры: 2, 5, 10, 15"
                className={createAttempted && (createData.positionExperienceYears === undefined || createData.positionExperienceYears === null) ? 'border-red-500 dark:border-red-500' : ''}
              />
            </div>

            {/* Дата последнего медосмотра */}
            <Input
              label="Дата последнего медосмотра *"
              type="date"
              value={createData.lastExaminationDate || ''}
              onChange={(e) => setCreateData({ ...createData, lastExaminationDate: e.target.value })}
              title="📅 Введите дату последнего медосмотра&#10;&#10;Примеры:&#10;• 22.01.2024&#10;• 15.03.2023&#10;• 01.12.2024"
              className={createAttempted && !createData.lastExaminationDate ? 'border-red-500 dark:border-red-500' : ''}
            />

            {/* Вредные факторы */}
            <div className="relative">
              <label className="block text-sm font-medium mb-1">Профессиональная вредность *</label>
              <div className="relative">
                <Input
                  value={createData.harmfulFactors?.[0] || ''}
                  onChange={(e) => setCreateHarmfulFactorsSearch(e.target.value)}
                  onFocus={() => setShowCreateHarmfulFactorsDropdown(true)}
                  placeholder="Выберите вредный фактор"
                  className={`pr-8 ${createAttempted && (!createData.harmfulFactors || createData.harmfulFactors.length === 0) ? 'border-red-500 dark:border-red-500' : ''}`}
                  title="⚠️ Выберите вредный фактор согласно приказу № ҚР ДСМ-131/2020&#10;&#10;Начните вводить текст для поиска"
                />
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              
              {showCreateHarmfulFactorsDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {HARMFUL_FACTORS_OPTIONS
                    .filter(factor => 
                      factor.toLowerCase().includes(createHarmfulFactorsSearch.toLowerCase())
                    )
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

            {/* Примечание */}
            <div>
              <label className="block text-sm font-medium mb-1">Примечание</label>
              <textarea
                value={createData.notes || ''}
                onChange={(e) => setCreateData({ ...createData, notes: e.target.value })}
                placeholder="Дополнительная информация"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[60px] text-sm"
                title="📝 Дополнительная информация о сотруднике&#10;&#10;Например:&#10;• Особые условия труда&#10;• Медицинские ограничения&#10;• Другие важные сведения"
                maxLength={1000}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={handleCancelCreate}>
              Отмена
            </Button>
            <Button variant="primary" onClick={handleCreateEmployee}>
              <Save className="h-4 w-4 mr-2" />
              Сохранить
            </Button>
          </div>
        </Modal>

        {/* Edit Employee Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={handleCancelEdit}
          title="Редактировать сотрудника"
          size="lg"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
            {/* ФИО */}
            <Input
              label="ФИО *"
              value={editData.name || ''}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              placeholder="Иванов Иван Иванович"
              title="👤 Введите полное ФИО сотрудника&#10;&#10;Формат: Фамилия Имя Отчество&#10;&#10;Примеры:&#10;• Иванов Иван Иванович&#10;• Петрова Мария Петровна"
              className={editAttempted && !editData.name ? 'border-red-500 dark:border-red-500' : ''}
            />

            {/* Объект/участок и Должность */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Объект/участок *"
                value={editData.department || ''}
                onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                placeholder="Участок №1"
                title="🏢 Укажите место работы сотрудника&#10;&#10;Примеры:&#10;• ТОО &quot;Компания&quot; - Отдел продаж&#10;• Производственный участок №1&#10;• Административный корпус"
                className={editAttempted && !editData.department ? 'border-red-500 dark:border-red-500' : ''}
              />
              <Input
                label="Должность *"
                value={editData.position || ''}
                onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                placeholder="Оператор"
                title="💼 Укажите должность сотрудника&#10;&#10;Примеры:&#10;• Оператор станков с ЧПУ&#10;• Главный бухгалтер&#10;• Инженер-технолог&#10;• Водитель погрузчика"
                className={editAttempted && !editData.position ? 'border-red-500 dark:border-red-500' : ''}
              />
            </div>

            {/* Дата рождения и Пол */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Дата рождения *"
                type="date"
                value={editData.birthDate ? new Date(editData.birthDate).toISOString().split('T')[0] : ''}
                onChange={(e) => setEditData({ ...editData, birthDate: e.target.value })}
                title="📅 Введите дату рождения&#10;&#10;Примеры:&#10;• 29.03.1976&#10;• 15.05.1985&#10;• 01.01.1990"
                className={editAttempted && !editData.birthDate ? 'border-red-500 dark:border-red-500' : ''}
              />
              <div>
                <label className="block text-sm font-medium mb-1">Пол *</label>
                <select
                  value={editData.gender || ''}
                  onChange={(e) => setEditData({ ...editData, gender: e.target.value as 'male' | 'female' })}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-sm ${
                    editAttempted && !editData.gender 
                      ? 'border-red-500 dark:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  title="Выберите пол сотрудника"
                >
                  <option value="">Не указан</option>
                  <option value="male">Мужской</option>
                  <option value="female">Женский</option>
                </select>
              </div>
            </div>

            {/* Телефон */}
            <Input
              label="Телефон"
              value={editData.phone || ''}
              onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
              placeholder="77001234567"
              title="📱 Введите номер телефона&#10;&#10;Формат: 7XXXXXXXXXX&#10;&#10;Примеры:&#10;• 77001234567&#10;• 77051234567"
            />

            {/* Стаж */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Общий стаж (лет) *"
                type="number"
                value={editData.totalExperienceYears !== undefined ? editData.totalExperienceYears : ''}
                onChange={(e) => setEditData({ ...editData, totalExperienceYears: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="20"
                min="0"
                title="📊 Введите общий трудовой стаж в годах&#10;&#10;Только целые числа ≥ 0&#10;&#10;Примеры: 5, 10, 20, 35"
                className={editAttempted && (editData.totalExperienceYears === undefined || editData.totalExperienceYears === null) ? 'border-red-500 dark:border-red-500' : ''}
              />
              <Input
                label="Стаж по должности (лет) *"
                type="number"
                value={editData.positionExperienceYears !== undefined ? editData.positionExperienceYears : ''}
                onChange={(e) => setEditData({ ...editData, positionExperienceYears: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="15"
                min="0"
                title="📊 Введите стаж работы по текущей должности в годах&#10;&#10;Только целые числа ≥ 0&#10;&#10;Примеры: 2, 5, 10, 15"
                className={editAttempted && (editData.positionExperienceYears === undefined || editData.positionExperienceYears === null) ? 'border-red-500 dark:border-red-500' : ''}
              />
            </div>

            {/* Дата последнего медосмотра */}
            <Input
              label="Дата последнего медосмотра *"
              type="date"
              value={editData.lastExaminationDate ? new Date(editData.lastExaminationDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setEditData({ ...editData, lastExaminationDate: e.target.value })}
              title="📅 Введите дату последнего медосмотра&#10;&#10;Примеры:&#10;• 22.01.2024&#10;• 15.03.2023&#10;• 01.12.2024"
              className={editAttempted && !editData.lastExaminationDate ? 'border-red-500 dark:border-red-500' : ''}
            />

            {/* Вредные факторы */}
            <div className="relative">
              <label className="block text-sm font-medium mb-1">Профессиональная вредность *</label>
              <div className="relative">
                <Input
                  value={editData.harmfulFactors?.[0] || ''}
                  onChange={(e) => setEditHarmfulFactorsSearch(e.target.value)}
                  onFocus={() => setShowEditHarmfulFactorsDropdown(true)}
                  placeholder="Выберите вредный фактор"
                  className={`pr-8 ${editAttempted && (!editData.harmfulFactors || editData.harmfulFactors.length === 0) ? 'border-red-500 dark:border-red-500' : ''}`}
                  title="⚠️ Выберите вредный фактор согласно приказу № ҚР ДСМ-131/2020&#10;&#10;Начните вводить текст для поиска"
                />
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
              
              {showEditHarmfulFactorsDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {HARMFUL_FACTORS_OPTIONS
                    .filter(factor => 
                      factor.toLowerCase().includes(editHarmfulFactorsSearch.toLowerCase())
                    )
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

            {/* Примечание */}
            <div>
              <label className="block text-sm font-medium mb-1">Примечание</label>
              <textarea
                value={editData.notes || ''}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                placeholder="Дополнительная информация"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[60px] text-sm"
                title="📝 Дополнительная информация о сотруднике&#10;&#10;Например:&#10;• Особые условия труда&#10;• Медицинские ограничения&#10;• Другие важные сведения"
                maxLength={1000}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={handleCancelEdit}>
              Отмена
            </Button>
            <Button variant="primary" onClick={handleSaveEdit}>
              <Save className="h-4 w-4 mr-2" />
              Сохранить изменения
            </Button>
          </div>
        </Modal>

        {/* QR Code Modal */}
        {qrCodeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">QR-код сотрудника</h3>
                  <button
                    onClick={() => setQrCodeModal(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="text-center mb-4">
                  <img 
                    src={qrCodeModal.qrUrl} 
                    alt="QR код сотрудника" 
                    className="w-64 h-64 mx-auto border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white"
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                    Сотрудник может показать этот QR-код в клинике для быстрой регистрации
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = qrCodeModal.qrUrl;
                      link.download = `qr_employee_${qrCodeModal.employeeId}.png`;
                      link.click();
                    }}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Скачать
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setQrCodeModal(null)}
                    className="flex-1"
                  >
                    Закрыть
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
