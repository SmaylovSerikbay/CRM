'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ArrowLeft, Users, Upload, Download, Plus, Edit2, Trash2, Search, Filter } from 'lucide-react';
import { workflowStoreAPI, ContingentEmployee } from '@/lib/store/workflow-store-api';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
import * as XLSX from 'xlsx';

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

export default function ContractContingentPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const contractId = params.contractId as string;
  
  const [contract, setContract] = useState<any>(null);
  const [contingent, setContingent] = useState<ContingentEmployee[]>([]);
  const [allContingent, setAllContingent] = useState<ContingentEmployee[]>([]); // Для поиска и экспорта
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [existingCount, setExistingCount] = useState(0);
  
  // Server-side пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(0);
  
  // Редактирование и создание сотрудников
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ContingentEmployee>>({});
  const [createData, setCreateData] = useState<Partial<ContingentEmployee>>({});
  const [editAttempted, setEditAttempted] = useState(false);
  const [createAttempted, setCreateAttempted] = useState(false);
  
  // Состояния для выпадающих списков вредных факторов
  const [showEditHarmfulFactorsDropdown, setShowEditHarmfulFactorsDropdown] = useState(false);
  const [showCreateHarmfulFactorsDropdown, setShowCreateHarmfulFactorsDropdown] = useState(false);
  const [editHarmfulFactorsSearch, setEditHarmfulFactorsSearch] = useState('');
  const [createHarmfulFactorsSearch, setCreateHarmfulFactorsSearch] = useState('');

  useEffect(() => {
    if (contractId) {
      loadData(1);
      // Загружаем все данные для поиска в фоне
      setTimeout(() => loadAllDataForSearch(), 1000);
    }
  }, [contractId]);

  useEffect(() => {
    if (contractId) {
      loadData(currentPage);
    }
  }, [currentPage]);

  // Закрытие выпадающих списков при клике вне их
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.harmful-factors-dropdown')) {
        setShowEditHarmfulFactorsDropdown(false);
        setShowCreateHarmfulFactorsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadData = async (page: number = 1, forceRefresh: boolean = false) => {
    try {
      setIsLoading(true);
      console.log(`Loading data for contract ${contractId}, page ${page}, forceRefresh: ${forceRefresh}`);
      
      // Загружаем страницу данных с пагинацией
      const result = await workflowStoreAPI.getContingentByContract(contractId, !forceRefresh, page, itemsPerPage);
      console.log(`Loaded ${result.data.length} records, total count: ${result.pagination.count}, total pages: ${result.pagination.totalPages}`);
      
      setContingent(result.data);
      setTotalCount(result.pagination.count);
      setServerTotalPages(result.pagination.totalPages);
      setCurrentPage(result.pagination.page);
      
      // Если есть контингент, получаем информацию о договоре из первого сотрудника
      if (result.data.length > 0 && result.data[0].contractNumber) {
        setContract({
          id: contractId,
          contract_number: result.data[0].contractNumber,
          employer_name: result.data[0].employerName
        });
      } else if (result.pagination.count === 0) {
        // Если контингента нет, загружаем информацию о договоре отдельно
        const contracts = await workflowStoreAPI.getContracts();
        const foundContract = contracts.find((c: any) => c.id.toString() === contractId);
        
        if (!foundContract) {
          showToast('Договор не найден', 'error');
          router.push('/dashboard/clinic/contracts');
          return;
        }
        
        setContract(foundContract);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Ошибка загрузки данных', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllDataForSearch = async () => {
    try {
      const allData = await workflowStoreAPI.getAllContingentByContract(contractId);
      setAllContingent(allData);
    } catch (error) {
      console.error('Error loading all data:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, replaceExisting: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    console.log('=== FILE UPLOAD START ===');
    console.log('File:', file.name, 'Size:', file.size, 'Type:', file.type);
    console.log('Contract ID:', contractId);
    console.log('Current contingent count BEFORE upload:', totalCount);
    console.log('Replace existing:', replaceExisting);
    
    if (!contractId) {
      showToast('Ошибка: не указан ID договора', 'error');
      return;
    }
    
    setIsUploading(true);
    try {
      console.log('Calling uploadExcelContingent API...');
      const result = await workflowStoreAPI.uploadExcelContingent(file, contractId, replaceExisting);
      console.log('=== UPLOAD RESULT ===');
      console.log('Created:', result.created);
      console.log('Skipped:', result.skipped);
      console.log('Skipped reasons:', result.skipped_reasons);
      
      // Перезагружаем данные без кэша для получения актуальных данных
      console.log('Reloading data after upload...');
      await loadData(1, true); // Перезагружаем первую страницу без кэша
      
      // Также обновляем все данные для поиска
      setTimeout(() => {
        console.log('Loading all data for search after upload...');
        loadAllDataForSearch();
      }, 500);
      
      if (replaceExisting) {
        showToast(`Контингент заменен! Загружено: ${result.created} записей`, 'success');
      } else if (result.skipped > 0) {
        const reasons = result.skipped_reasons || {};
        const reasonsText = [
          reasons.duplicate ? `дубликаты: ${reasons.duplicate}` : '',
          reasons.no_name ? `нет ФИО: ${reasons.no_name}` : '',
        ].filter(Boolean).join(', ');
        showToast(`Загружено: ${result.created}, пропущено (${reasonsText || 'разные причины'}): ${result.skipped}`, 'info');
      } else {
        showToast('Контингент успешно загружен!', 'success');
      }
      
      setShowUploadModal(false);
      setShowReplaceConfirm(false);
      setPendingFile(null);
    } catch (error: any) {
      console.error('Upload error:', error);
      
      // Проверяем, если это предупреждение о существующих данных
      if (error.message && error.message.includes('уже есть') && error.message.includes('сотрудников')) {
        // Парсим количество существующих записей из сообщения
        const match = error.message.match(/уже есть (\d+) сотрудников/);
        const count = match ? parseInt(match[1]) : totalCount;
        
        setExistingCount(count);
        setPendingFile(file);
        setShowUploadModal(false);
        setShowReplaceConfirm(true);
        return;
      }
      
      showToast(error.message || 'Ошибка загрузки файла', 'error');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleConfirmReplace = async () => {
    if (!pendingFile) return;
    
    // Загружаем файл с флагом замены
    const fakeEvent = {
      target: { value: '', files: [pendingFile] }
    } as any;
    
    await handleFileUpload(fakeEvent, true);
  };

  const handleCancelReplace = () => {
    setShowReplaceConfirm(false);
    setPendingFile(null);
    setExistingCount(0);
  };

  // Функции редактирования сотрудника
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
    
    // Валидация обязательных полей
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
      await workflowStoreAPI.updateContingentEmployee('clinic', editingId, editData);
      
      // Перезагружаем данные
      await loadData(currentPage, true);
      setTimeout(() => loadAllDataForSearch(), 500);
      
      // Закрываем модальное окно и очищаем состояние
      setEditingId(null);
      setEditData({});
      setShowEditModal(false);
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
    setEditAttempted(false);
    setShowEditHarmfulFactorsDropdown(false);
    setEditHarmfulFactorsSearch('');
  };

  // Функции создания сотрудника
  const handleCreateEmployee = async () => {
    setCreateAttempted(true);
    
    // Валидация обязательных полей
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
      showToast(`Заполните обязательные поля: ${missingFields.join(', ')}`, 'error');
      return;
    }

    try {
      await workflowStoreAPI.createContingentEmployee({
        ...createData,
        contractId: contractId,
      });
      
      // Перезагружаем данные
      await loadData(1, true); // Переходим на первую страницу чтобы увидеть нового сотрудника
      setTimeout(() => loadAllDataForSearch(), 500);
      
      // Закрываем модальное окно и очищаем форму
      setShowCreateModal(false);
      setCreateData({});
      setCreateAttempted(false);
      
      showToast('Сотрудник успешно добавлен', 'success');
    } catch (error: any) {
      console.error('Error creating employee:', error);
      showToast(error.message || 'Ошибка создания сотрудника', 'error');
    }
  };

  const handleCancelCreate = () => {
    setShowCreateModal(false);
    setCreateData({});
    setCreateAttempted(false);
    setShowCreateHarmfulFactorsDropdown(false);
    setCreateHarmfulFactorsSearch('');
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого сотрудника?')) return;
    
    try {
      await workflowStoreAPI.deleteContingentEmployee(employeeId);
      
      // Перезагружаем данные
      await loadData(currentPage, true);
      setTimeout(() => loadAllDataForSearch(), 500);
      
      showToast('Сотрудник удален', 'success');
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      showToast(error.message || 'Ошибка удаления', 'error');
    }
  };

  const handleExportContingent = async () => {
    try {
      if (contingent.length === 0) {
        showToast('Нет данных для экспорта', 'warning');
        return;
      }

      const contingentData = contingent.map(employee => ({
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

      const fileName = `Контингент_Договор_${contract?.contract_number}_${new Date().toLocaleDateString('ru-RU')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      showToast('Файл успешно загружен', 'success');
    } catch (error: any) {
      console.error('Export error:', error);
      showToast(error.message || 'Ошибка экспорта', 'error');
    }
  };




  // Для поиска используем все данные, для отображения - текущую страницу
  const displayContingent = searchQuery ? 
    allContingent.filter(employee => {
      const searchLower = searchQuery.toLowerCase();
      return employee.name.toLowerCase().includes(searchLower) ||
        employee.position.toLowerCase().includes(searchLower) ||
        employee.department.toLowerCase().includes(searchLower) ||
        employee.harmfulFactors?.some(factor => factor.toLowerCase().includes(searchLower));
    }) : 
    contingent;

  // Пагинация для поиска (client-side) или server-side
  const totalPages = searchQuery ? 
    Math.ceil(displayContingent.length / itemsPerPage) : 
    serverTotalPages;
  
  const paginatedContingent = searchQuery ? 
    displayContingent.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) :
    displayContingent;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-6">
      {/* Хлебные крошки */}
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Link href="/dashboard/clinic/contracts" className="hover:text-blue-600 dark:hover:text-blue-400">
          Договоры
        </Link>
        <span>/</span>
        <Link href={`/dashboard/clinic/contracts/${contractId}`} className="hover:text-blue-600 dark:hover:text-blue-400">
          Договор №{contract?.contract_number}
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white">Контингент</span>
      </div>

      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/clinic/contracts/${contractId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад к договору
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Контингент
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Договор №{contract?.contract_number} - {totalCount} сотрудников
            </p>
          </div>
        </div>
        <div className="flex gap-2">
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
          <Button variant="outline" onClick={handleExportContingent}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
          <Button variant="outline" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить сотрудника
          </Button>
          <Button onClick={() => setShowUploadModal(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Загрузить файл
          </Button>
        </div>
      </div>

      {/* Поиск */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Поиск по ФИО, должности, объекту/участку..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Всего сотрудников</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalCount}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Search className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Показано</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {paginatedContingent.length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Filter className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Подразделений</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Set((allContingent.length > 0 ? allContingent : contingent).map(emp => emp.department)).size}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Должностей</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Set(contingent.map(emp => emp.position)).size}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Список сотрудников */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Список сотрудников ({searchQuery ? displayContingent.length : totalCount})
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Показано: {paginatedContingent.length} из {searchQuery ? displayContingent.length : totalCount}
          </div>
        </div>
        
        {paginatedContingent.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {searchQuery ? 'Сотрудники не найдены' : 'Контингент не загружен'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">ФИО</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Должность</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Объект или участок</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Профессиональная вредность</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Телефон</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Действия</th>
                </tr>
              </thead>
              <tbody>
                {paginatedContingent.map((employee) => (
                  <motion.tr
                    key={employee.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{employee.name}</p>
                        {employee.birthDate && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(employee.birthDate).toLocaleDateString('ru-RU')}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">{employee.position}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">{employee.department}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {employee.harmfulFactors?.slice(0, 2).map((factor, idx) => (
                          <span key={idx} className="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded">
                            {factor.length > 20 ? `${factor.substring(0, 20)}...` : factor}
                          </span>
                        ))}
                        {employee.harmfulFactors && employee.harmfulFactors.length > 2 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                            +{employee.harmfulFactors.length - 2}
                          </span>
                        )}
                        {(!employee.harmfulFactors || employee.harmfulFactors.length === 0) && (
                          <span className="text-gray-400 text-sm">Не указано</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">{employee.phone || 'Не указан'}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEdit(employee)}
                          title="Редактировать"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDeleteEmployee(employee.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Пагинация */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Страница {currentPage} из {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Назад
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Вперед
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Модальное окно загрузки */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Загрузка контингента"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Выберите Excel файл с данными контингента для загрузки в договор №{contract?.contract_number}
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Нужен шаблон Excel?
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Скачайте стандартный шаблон для заполнения данных контингента
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
          
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
            {isUploading ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-blue-600 dark:text-blue-400 font-medium">Загрузка файла...</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Пожалуйста, подождите</p>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Перетащите файл сюда или выберите файл
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer">
                    Выбрать файл
                  </span>
                </label>
              </>
            )}
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>Поддерживаемые форматы: .xlsx, .xls</p>
            <p>Максимальный размер файла: 10 МБ</p>
          </div>
        </div>
      </Modal>

      {/* Модальное окно подтверждения замены */}
      <Modal
        isOpen={showReplaceConfirm}
        onClose={handleCancelReplace}
        title="Подтверждение замены данных"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Внимание! Данные будут заменены
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>
                    В договоре №{contract?.contract_number} уже есть <strong>{existingCount} сотрудников</strong>.
                  </p>
                  <p className="mt-2">
                    Загрузка нового файла <strong>полностью заменит</strong> все существующие записи.
                  </p>
                  <p className="mt-2">
                    Если вы хотите добавить новых сотрудников к существующим, сначала экспортируйте текущий список, 
                    добавьте новых сотрудников в файл, а затем загрузите обновленный файл.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4">
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  await handleExportContingent();
                  showToast('Текущий список экспортирован. Добавьте новых сотрудников в файл и загрузите обновленный список.', 'info');
                } catch (error: any) {
                  showToast(error.message || 'Ошибка экспорта', 'error');
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Сначала экспортировать
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancelReplace}>
                Отмена
              </Button>
              <Button 
                onClick={handleConfirmReplace}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={isUploading}
              >
                {isUploading ? 'Загрузка...' : 'Заменить данные'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Модальное окно редактирования сотрудника */}
      <Modal
        isOpen={showEditModal}
        onClose={handleCancelEdit}
        title="Редактировать сотрудника"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ФИО <span className="text-red-500">*</span>
              </label>
              <Input
                value={editData.name || ''}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                placeholder="Введите ФИО"
                className={editAttempted && !editData.name ? 'border-red-500' : ''}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Должность <span className="text-red-500">*</span>
              </label>
              <Input
                value={editData.position || ''}
                onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                placeholder="Введите должность"
                className={editAttempted && !editData.position ? 'border-red-500' : ''}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Объект/участок <span className="text-red-500">*</span>
              </label>
              <Input
                value={editData.department || ''}
                onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                placeholder="Введите объект/участок"
                className={editAttempted && !editData.department ? 'border-red-500' : ''}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Дата рождения <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={editData.birthDate || ''}
                onChange={(e) => setEditData({ ...editData, birthDate: e.target.value })}
                className={editAttempted && !editData.birthDate ? 'border-red-500' : ''}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Пол <span className="text-red-500">*</span>
              </label>
              <select
                value={editData.gender || ''}
                onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white ${editAttempted && !editData.gender ? 'border-red-500' : ''}`}
              >
                <option value="">Выберите пол</option>
                <option value="М">Мужской</option>
                <option value="Ж">Женский</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Телефон
              </label>
              <Input
                value={editData.phone || ''}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                placeholder="Введите телефон"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Общий стаж (лет) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                value={editData.totalExperienceYears || ''}
                onChange={(e) => setEditData({ ...editData, totalExperienceYears: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className={editAttempted && (editData.totalExperienceYears === undefined || editData.totalExperienceYears === null) ? 'border-red-500' : ''}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Стаж по должности (лет) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                value={editData.positionExperienceYears || ''}
                onChange={(e) => setEditData({ ...editData, positionExperienceYears: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className={editAttempted && (editData.positionExperienceYears === undefined || editData.positionExperienceYears === null) ? 'border-red-500' : ''}
              />
            </div>
          </div>
          
          {/* Вредные факторы для редактирования */}
          <div className="relative harmful-factors-dropdown">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Вредные факторы
            </label>
            <div className="space-y-2">
              {/* Поиск по вредным факторам */}
              <div className="relative">
                <Input
                  value={editHarmfulFactorsSearch}
                  onChange={(e) => setEditHarmfulFactorsSearch(e.target.value)}
                  onFocus={() => setShowEditHarmfulFactorsDropdown(true)}
                  placeholder="Выберите вредный фактор..."
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowEditHarmfulFactorsDropdown(!showEditHarmfulFactorsDropdown)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              {/* Выбранный вредный фактор */}
              {editData.harmfulFactors && editData.harmfulFactors.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Выбранный фактор:</div>
                  <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md">
                    {editData.harmfulFactors[0].length > 50 ? `${editData.harmfulFactors[0].substring(0, 50)}...` : editData.harmfulFactors[0]}
                    <button
                      type="button"
                      onClick={() => {
                        setEditData({ ...editData, harmfulFactors: [] });
                      }}
                      className="ml-1 text-blue-500 hover:text-blue-700"
                    >
                      ×
                    </button>
                  </span>
                </div>
              )}
              
              {/* Выпадающий список */}
              {showEditHarmfulFactorsDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {HARMFUL_FACTORS_OPTIONS
                    .filter(factor => 
                      factor.toLowerCase().includes(editHarmfulFactorsSearch.toLowerCase())
                    )
                    .map((factor) => {
                      const isSelected = editData.harmfulFactors?.[0] === factor;
                      return (
                        <div
                          key={factor}
                          onClick={() => {
                            // Выбираем только один фактор
                            setEditData({ ...editData, harmfulFactors: [factor] });
                            setShowEditHarmfulFactorsDropdown(false);
                            setEditHarmfulFactorsSearch('');
                          }}
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                            isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
                          }`}
                        >
                          <div className="flex items-center">
                            <input
                              type="radio"
                              checked={isSelected}
                              onChange={() => {}} // Обработка в onClick родителя
                              className="mr-2"
                            />
                            <span className="text-sm">{factor}</span>
                          </div>
                        </div>
                      );
                    })}
                  {HARMFUL_FACTORS_OPTIONS.filter(factor =>
                    factor.toLowerCase().includes(editHarmfulFactorsSearch.toLowerCase())
                  ).length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      Вредные факторы не найдены
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Примечания
            </label>
            <textarea
              value={editData.notes || ''}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              placeholder="Дополнительная информация"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
          
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="outline" onClick={handleCancelEdit}>
              Отмена
            </Button>
            <Button variant="primary" onClick={handleSaveEdit}>
              Сохранить
            </Button>
          </div>
        </div>
      </Modal>

      {/* Модальное окно создания сотрудника */}
      <Modal
        isOpen={showCreateModal}
        onClose={handleCancelCreate}
        title="Добавить сотрудника"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ФИО <span className="text-red-500">*</span>
              </label>
              <Input
                value={createData.name || ''}
                onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                placeholder="Введите ФИО"
                className={createAttempted && !createData.name ? 'border-red-500' : ''}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Должность <span className="text-red-500">*</span>
              </label>
              <Input
                value={createData.position || ''}
                onChange={(e) => setCreateData({ ...createData, position: e.target.value })}
                placeholder="Введите должность"
                className={createAttempted && !createData.position ? 'border-red-500' : ''}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Объект/участок <span className="text-red-500">*</span>
              </label>
              <Input
                value={createData.department || ''}
                onChange={(e) => setCreateData({ ...createData, department: e.target.value })}
                placeholder="Введите объект/участок"
                className={createAttempted && !createData.department ? 'border-red-500' : ''}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Дата рождения <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={createData.birthDate || ''}
                onChange={(e) => setCreateData({ ...createData, birthDate: e.target.value })}
                className={createAttempted && !createData.birthDate ? 'border-red-500' : ''}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Пол <span className="text-red-500">*</span>
              </label>
              <select
                value={createData.gender || ''}
                onChange={(e) => setCreateData({ ...createData, gender: e.target.value })}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white ${createAttempted && !createData.gender ? 'border-red-500' : ''}`}
              >
                <option value="">Выберите пол</option>
                <option value="М">Мужской</option>
                <option value="Ж">Женский</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Телефон
              </label>
              <Input
                value={createData.phone || ''}
                onChange={(e) => setCreateData({ ...createData, phone: e.target.value })}
                placeholder="Введите телефон"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Общий стаж (лет) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                value={createData.totalExperienceYears || ''}
                onChange={(e) => setCreateData({ ...createData, totalExperienceYears: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className={createAttempted && !createData.totalExperienceYears && createData.totalExperienceYears !== 0 ? 'border-red-500' : ''}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Стаж по должности (лет) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                value={createData.positionExperienceYears || ''}
                onChange={(e) => setCreateData({ ...createData, positionExperienceYears: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className={createAttempted && !createData.positionExperienceYears && createData.positionExperienceYears !== 0 ? 'border-red-500' : ''}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Дата последнего медосмотра <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={createData.lastExaminationDate || ''}
                onChange={(e) => setCreateData({ ...createData, lastExaminationDate: e.target.value })}
                className={createAttempted && !createData.lastExaminationDate ? 'border-red-500' : ''}
              />
            </div>
            <div className="relative harmful-factors-dropdown">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Вредные факторы <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {/* Поиск по вредным факторам */}
                <div className="relative">
                  <Input
                    value={createHarmfulFactorsSearch}
                    onChange={(e) => setCreateHarmfulFactorsSearch(e.target.value)}
                    onFocus={() => setShowCreateHarmfulFactorsDropdown(true)}
                    placeholder="Выберите вредный фактор..."
                    className={`pr-10 ${createAttempted && (!createData.harmfulFactors || createData.harmfulFactors.length === 0) ? 'border-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreateHarmfulFactorsDropdown(!showCreateHarmfulFactorsDropdown)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                
                {/* Выбранный вредный фактор */}
                {createData.harmfulFactors && createData.harmfulFactors.length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Выбранный фактор:</div>
                    <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md">
                      {createData.harmfulFactors[0].length > 50 ? `${createData.harmfulFactors[0].substring(0, 50)}...` : createData.harmfulFactors[0]}
                      <button
                        type="button"
                        onClick={() => {
                          setCreateData({ ...createData, harmfulFactors: [] });
                        }}
                        className="ml-1 text-blue-500 hover:text-blue-700"
                      >
                        ×
                      </button>
                    </span>
                  </div>
                )}
                
                {/* Выпадающий список */}
                {showCreateHarmfulFactorsDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {HARMFUL_FACTORS_OPTIONS
                      .filter(factor => 
                        factor.toLowerCase().includes(createHarmfulFactorsSearch.toLowerCase())
                      )
                      .map((factor) => {
                        const isSelected = createData.harmfulFactors?.[0] === factor;
                        return (
                          <div
                            key={factor}
                            onClick={() => {
                              // Выбираем только один фактор
                              setCreateData({ ...createData, harmfulFactors: [factor] });
                              setShowCreateHarmfulFactorsDropdown(false);
                              setCreateHarmfulFactorsSearch('');
                            }}
                            className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                              isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''
                            }`}
                          >
                            <div className="flex items-center">
                              <input
                                type="radio"
                                checked={isSelected}
                                onChange={() => {}} // Обработка в onClick родителя
                                className="mr-2"
                              />
                              <span className="text-sm">{factor}</span>
                            </div>
                          </div>
                        );
                      })}
                    {HARMFUL_FACTORS_OPTIONS.filter(factor =>
                      factor.toLowerCase().includes(createHarmfulFactorsSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                        Факторы не найдены
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Примечания
            </label>
            <textarea
              value={createData.notes || ''}
              onChange={(e) => setCreateData({ ...createData, notes: e.target.value })}
              placeholder="Дополнительная информация"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
          
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="outline" onClick={handleCancelCreate}>
              Отмена
            </Button>
            <Button variant="primary" onClick={handleCreateEmployee}>
              Создать
            </Button>
          </div>
        </div>
      </Modal>
        </div>
      </main>
    </div>
  );
}