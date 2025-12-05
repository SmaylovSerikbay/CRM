'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { QrCode, Search, FileText, Printer, CheckCircle, AlertCircle, User, Calendar, Building2, Briefcase, Clock, MapPin, CheckSquare, FlaskConical, Activity, ExternalLink, Plus, Scan, X, History, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { workflowStoreAPI } from '@/lib/store/workflow-store-api';
import { userStore } from '@/lib/store/user-store';
import { useToast } from '@/components/ui/Toast';

interface RouteSheet {
  id: string;
  patientId: string;
  patientName: string;
  iin: string;
  position: string;
  department: string;
  visitDate: string;
  services: {
    id: string;
    name: string;
    cabinet: string;
    doctorId: string;
    specialization?: string;
    time?: string;
    status: 'pending' | 'completed';
  }[];
}

export default function RouteSheetPage() {
  const { showToast } = useToast();
  const [routeSheets, setRouteSheets] = useState<RouteSheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentDoctor, setCurrentDoctor] = useState<any>(null);
  
  // Модальное окно для поиска
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Модальное окно для QR-сканера
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannedQRData, setScannedQRData] = useState<string>('');
  
  // Модальное окно для просмотра деталей
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRouteSheet, setSelectedRouteSheet] = useState<RouteSheet | null>(null);
  const [laboratoryTests, setLaboratoryTests] = useState<any[]>([]);
  const [functionalTests, setFunctionalTests] = useState<any[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  
  // Раскрытые строки в таблице
  const [expandedSheet, setExpandedSheet] = useState<string | null>(null);
  
  // Фильтры и поиск
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Загружаем информацию о текущем пользователе и враче
  useEffect(() => {
    const user = userStore.getCurrentUser();
    setCurrentUser(user);
    
    if (user && user.role === 'clinic' && user.clinicRole === 'doctor') {
      workflowStoreAPI.getDoctors().then(doctors => {
        if (doctors.length > 0) {
          setCurrentDoctor(doctors[0]);
        }
      }).catch(console.error);
    }
  }, []);

  useEffect(() => {
    loadRouteSheets();
  }, []);

  const loadRouteSheets = async () => {
    try {
      setIsLoading(true);
      const sheets = await workflowStoreAPI.getRouteSheets();
      setRouteSheets(sheets);
    } catch (error) {
      console.error('Error loading route sheets:', error);
      showToast('Ошибка загрузки маршрутных листов', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Загружаем детали выбранного листа
  useEffect(() => {
    const loadDetails = async () => {
      if (selectedRouteSheet && showDetailsModal) {
        try {
          const [labTests, funcTests] = await Promise.all([
            workflowStoreAPI.getLaboratoryTests(selectedRouteSheet.patientId, selectedRouteSheet.id),
            workflowStoreAPI.getFunctionalTests(selectedRouteSheet.patientId, selectedRouteSheet.id),
          ]);
          setLaboratoryTests(labTests);
          setFunctionalTests(funcTests);
          
          if (selectedRouteSheet.id) {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
            const qrUrl = `${apiUrl}/route-sheets/${selectedRouteSheet.id}/generate_qr_code/`;
            setQrCodeUrl(qrUrl);
          }
        } catch (error) {
          console.error('Error loading details:', error);
        }
      }
    };
    loadDetails();
  }, [selectedRouteSheet, showDetailsModal]);

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      setSearchError('Введите номер телефона, ФИО или ИИН пациента');
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const sheet = await workflowStoreAPI.generateRouteSheet(searchValue);
      if (sheet) {
        await loadRouteSheets();
        setSearchValue('');
        setShowSearchModal(false);
        showToast('Маршрутный лист создан!', 'success');
      } else {
        setSearchError('Пациент не найден. Проверьте данные. Убедитесь, что для пациента есть утвержденный календарный план.');
      }
    } catch (error: any) {
      console.error('Error generating route sheet:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Ошибка создания маршрутного листа';
      setSearchError(errorMessage);
    } finally {
      setIsSearching(false);
    }
  };

  const handleQRScan = async (qrData: string) => {
    setIsSearching(true);
    setSearchError(null);
    setShowQRScanner(false);

    try {
      const result = await workflowStoreAPI.findEmployeeByQR(qrData);
      
      if (result.found && result.employee) {
        const employee = result.employee;
        const searchValue = employee.iin || employee.name;
        
        const sheet = await workflowStoreAPI.generateRouteSheet(searchValue);
        if (sheet) {
          await loadRouteSheets();
          setSearchValue('');
          setScannedQRData('');
          setShowSearchModal(false);
          showToast('Маршрутный лист создан!', 'success');
        } else {
          setSearchError('Не удалось создать маршрутный лист. Убедитесь, что для сотрудника есть утвержденный календарный план.');
        }
      } else {
        setSearchError('Сотрудник не найден в базе данных');
      }
    } catch (error: any) {
      console.error('Error scanning QR:', error);
      setSearchError(error.message || 'Ошибка при сканировании QR-кода');
    } finally {
      setIsSearching(false);
    }
  };

  const canEditService = (service: any): boolean => {
    if (!currentUser || currentUser.role !== 'clinic' || currentUser.clinicRole !== 'doctor') {
      return false;
    }
    
    if (currentDoctor) {
      const serviceSpecialization = service.specialization || service.name;
      return currentDoctor.specialization === serviceSpecialization;
    }
    
    return false;
  };

  const handleToggleService = async (sheetId: string, serviceId: string, currentStatus: string) => {
    const sheet = routeSheets.find(s => s.id === sheetId);
    if (!sheet) return;

    const service = sheet.services.find(s => s.id === serviceId);
    if (!service) return;

    if (!canEditService(service)) {
      showToast('Вы можете отмечать только услуги по вашей специализации', 'warning');
      return;
    }

    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    try {
      await workflowStoreAPI.updateRouteSheetServiceStatus(sheetId, serviceId, newStatus);
      
      const updatedServices = sheet.services.map(s =>
        s.id === serviceId ? { ...s, status: newStatus as 'pending' | 'completed' } : s
      );
      
      setRouteSheets(routeSheets.map(s =>
        s.id === sheetId ? { ...s, services: updatedServices } : s
      ));

      if (selectedRouteSheet?.id === sheetId) {
        setSelectedRouteSheet({ ...selectedRouteSheet, services: updatedServices });
      }

      showToast('Статус услуги обновлен', 'success');
    } catch (error: any) {
      console.error('Error updating service status:', error);
      showToast(error?.response?.data?.error || error?.message || 'Ошибка обновления статуса услуги', 'error');
    }
  };

  const handleViewDetails = (sheet: RouteSheet) => {
    setSelectedRouteSheet(sheet);
    setShowDetailsModal(true);
  };

  const handlePrint = () => {
    window.print();
  };

  // Фильтрация и поиск
  const filteredSheets = useMemo(() => {
    return routeSheets.filter(sheet => {
      const matchesSearch = !searchQuery || 
        sheet.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sheet.iin.includes(searchQuery) ||
        sheet.position.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDate = !dateFilter || sheet.visitDate === dateFilter;
      
      const completedCount = sheet.services.filter(s => s.status === 'completed').length;
      const totalCount = sheet.services.length;
      let matchesStatus = true;
      if (statusFilter === 'completed') {
        matchesStatus = totalCount > 0 && completedCount === totalCount;
      } else if (statusFilter === 'pending') {
        matchesStatus = completedCount < totalCount;
      }
      
      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [routeSheets, searchQuery, dateFilter, statusFilter]);

  // Пагинация
  const totalPages = Math.ceil(filteredSheets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSheets = filteredSheets.slice(startIndex, endIndex);

  const getProgress = (sheet: RouteSheet) => {
    const completed = sheet.services.filter(s => s.status === 'completed').length;
    const total = sheet.services.length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  const getStatusLabel = (sheet: RouteSheet) => {
    const { completed, total } = getProgress(sheet);
    if (total === 0) return { label: 'Нет услуг', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' };
    if (completed === total) return { label: 'Завершен', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
    if (completed > 0) return { label: 'В процессе', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };
    return { label: 'Не начат', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' };
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Маршрутные листы</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Создание и управление маршрутными листами для пациентов
              </p>
            </div>
            <Button onClick={() => setShowSearchModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать лист
            </Button>
          </div>

          {/* Поиск и фильтры */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Поиск по ФИО, ИИН, должности..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-auto"
            />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'all' | 'completed' | 'pending');
                setCurrentPage(1);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Все статусы</option>
              <option value="completed">Завершенные</option>
              <option value="pending">В процессе</option>
            </select>
            {(searchQuery || dateFilter || statusFilter !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setDateFilter('');
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Сбросить
              </Button>
            )}
          </div>

          {/* Счетчик результатов и пагинация */}
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700 mt-3">
            <div className="flex items-center gap-4">
              <span>
                Показано {startIndex + 1}-{Math.min(endIndex, filteredSheets.length)} из {filteredSheets.length} ({routeSheets.length} всего)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">На странице:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Назад
                </Button>
                <span className="text-xs px-2">
                  {currentPage} / {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages || 1, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Вперед
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
        <div className="px-6 py-4">
          {filteredSheets.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Маршрутные листы не найдены</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {(searchQuery || dateFilter || statusFilter !== 'all') 
                  ? 'Попробуйте изменить параметры поиска'
                  : 'Создайте первый маршрутный лист для пациента'}
              </p>
              {!(searchQuery || dateFilter || statusFilter !== 'all') && (
                <Button onClick={() => setShowSearchModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Создать маршрутный лист
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider w-10">
                        №
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Пациент
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        ИИН
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Должность / Отдел
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Дата визита
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Прогресс
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Статус
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                    {paginatedSheets.map((sheet, index) => {
                      const progress = getProgress(sheet);
                      const status = getStatusLabel(sheet);
                      
                      return (
                        <>
                          <motion.tr
                            key={sheet.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.02 }}
                            className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                              expandedSheet === sheet.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400' : ''
                            }`}
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                              {startIndex + index + 1}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {sheet.patientName}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {sheet.iin}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900 dark:text-white">
                                <div className="flex items-center gap-1">
                                  <Briefcase className="h-3.5 w-3.5 text-gray-400" />
                                  <span>{sheet.position}</span>
                                </div>
                                <div className="flex items-center gap-1 mt-1 text-xs text-gray-600 dark:text-gray-400">
                                  <Building2 className="h-3 w-3 text-gray-400" />
                                  <span>{sheet.department}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                <span>{new Date(sheet.visitDate).toLocaleDateString('ru-RU')}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-gray-900 dark:text-white font-medium">
                                    {progress.completed}/{progress.total}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    ({Math.round(progress.percentage)}%)
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                  <div
                                    className="bg-green-500 h-1.5 rounded-full transition-all"
                                    style={{ width: `${progress.percentage}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                                {status.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewDetails(sheet)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Подробнее
                                </Button>
                                {sheet.services.length > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setExpandedSheet(expandedSheet === sheet.id ? null : sheet.id)}
                                  >
                                    {expandedSheet === sheet.id ? (
                                      <>
                                        <ChevronUp className="h-4 w-4 mr-1" />
                                        Скрыть
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-4 w-4 mr-1" />
                                        Услуги
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                          
                          {/* Раскрытая информация об услугах */}
                          {expandedSheet === sheet.id && sheet.services.length > 0 && (
                            <tr className="bg-blue-50/30 dark:bg-blue-900/10">
                              <td colSpan={8} className="px-0 py-0">
                                <AnimatePresence>
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="h-px bg-blue-300 dark:bg-blue-700 mx-4"></div>
                                    <div className="px-4 py-4 bg-blue-50/50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400">
                                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-center">
                                          <MapPin className="h-3.5 w-3.5 text-white" />
                                        </div>
                                        <span>Маршрут прохождения осмотра &quot;{sheet.patientName}&quot; ({sheet.services.length})</span>
                                      </h4>
                                      
                                      {/* Подтаблица услуг */}
                                      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                        <table className="w-full text-sm">
                                          <thead className="bg-gray-100 dark:bg-gray-800/70 border-b border-gray-200 dark:border-gray-700">
                                            <tr>
                                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                                                №
                                              </th>
                                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                                                Услуга
                                              </th>
                                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                                                Кабинет
                                              </th>
                                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                                                Время
                                              </th>
                                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                                                Статус
                                              </th>
                                              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                                                Действия
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                                            {sheet.services.map((service, idx) => (
                                              <motion.tr
                                                key={service.id || idx}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                                                  service.status === 'completed' ? 'bg-green-50/30 dark:bg-green-900/10' : ''
                                                }`}
                                              >
                                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-medium">
                                                  {idx + 1}
                                                </td>
                                                <td className="px-4 py-3">
                                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {service.name}
                                                  </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                                  {service.cabinet || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                                                  {service.time || '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                                    service.status === 'completed'
                                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                  }`}>
                                                    {service.status === 'completed' ? (
                                                      <>
                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                        Выполнено
                                                      </>
                                                    ) : (
                                                      <>
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        Ожидает
                                                      </>
                                                    )}
                                                  </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                  <div className="flex items-center justify-end gap-2">
                                                    {service.status === 'pending' && (
                                                      <button
                                                        onClick={() => {
                                                          workflowStoreAPI.addToQueueFromRouteSheet(sheet.id, service.id)
                                                            .then(() => showToast('Пациент добавлен в очередь', 'success'))
                                                            .catch((e: any) => showToast(e.message || 'Ошибка добавления в очередь', 'error'));
                                                        }}
                                                        className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
                                                        title="Добавить в очередь"
                                                      >
                                                        <Plus className="h-4 w-4" />
                                                      </button>
                                                    )}
                                                    {canEditService(service) ? (
                                                      <button
                                                        onClick={() => handleToggleService(sheet.id, service.id, service.status)}
                                                        className={`p-1.5 rounded transition-colors ${
                                                          service.status === 'completed'
                                                            ? 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400'
                                                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                                                        }`}
                                                        title={service.status === 'completed' ? 'Отметить как невыполненное' : 'Отметить как выполненное'}
                                                      >
                                                        <CheckSquare className="h-4 w-4" />
                                                      </button>
                                                    ) : (
                                                      <div className="p-1.5" title="Только врач соответствующей специализации может отмечать услуги">
                                                        {service.status === 'completed' ? (
                                                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                        ) : (
                                                          <AlertCircle className="h-4 w-4 text-gray-400" />
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                </td>
                                              </motion.tr>
                                            ))}
                                          </tbody>
                                        </table>
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
            </div>
          )}
        </div>
      </main>

      {/* Модальное окно поиска/создания */}
      <Modal
        isOpen={showSearchModal}
        onClose={() => {
          setShowSearchModal(false);
          setSearchValue('');
          setSearchError(null);
        }}
        title="Создать маршрутный лист"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <PhoneInput
              label="Номер телефона, ФИО или ИИН пациента"
              value={searchValue}
              onChange={(value) => {
                setSearchValue(value);
                setSearchError(null);
              }}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Поиск по ФИО или ИИН. Или отсканируйте QR-код сотрудника. Маршрут создается автоматически на основе должности и вредных факторов.
            </p>
          </div>
          
          {searchError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{searchError}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSearchModal(false);
                setShowQRScanner(true);
              }}
              className="flex-1"
            >
              <Scan className="h-4 w-4 mr-2" />
              Сканировать QR
            </Button>
            <Button
              onClick={handleSearch}
              isLoading={isSearching}
              disabled={!searchValue.trim()}
              className="flex-1"
            >
              <Search className="h-4 w-4 mr-2" />
              Найти
            </Button>
          </div>
        </div>
      </Modal>

      {/* Модальное окно QR-сканера */}
      <Modal
        isOpen={showQRScanner}
        onClose={() => {
          setShowQRScanner(false);
          setScannedQRData('');
        }}
        title="Сканирование QR-кода"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <Input
              label="Вставьте данные QR-кода"
              value={scannedQRData}
              onChange={(e) => setScannedQRData(e.target.value)}
              placeholder='{"type":"employee","employee_id":"1","iin":"...","name":"..."}'
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Вставьте JSON данные из QR-кода сотрудника или отсканируйте QR-код камерой
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (scannedQRData.trim()) {
                  handleQRScan(scannedQRData.trim());
                } else {
                  setSearchError('Введите данные QR-кода');
                }
              }}
              disabled={!scannedQRData.trim()}
              isLoading={isSearching}
              className="flex-1"
            >
              <Scan className="h-4 w-4 mr-2" />
              Найти сотрудника
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowQRScanner(false);
                setScannedQRData('');
              }}
            >
              Отмена
            </Button>
          </div>
        </div>
      </Modal>

      {/* Модальное окно деталей маршрутного листа */}
      {selectedRouteSheet && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedRouteSheet(null);
          }}
          title={`Маршрутный лист: ${selectedRouteSheet.patientName}`}
          size="xl"
        >
          <div className="space-y-6 print:block">
            {/* Информация о пациенте */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <User className="h-5 w-5" />
                Информация о пациенте
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">ФИО</p>
                  <p className="font-semibold">{selectedRouteSheet.patientName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">ИИН</p>
                  <p className="font-semibold">{selectedRouteSheet.iin}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    Должность
                  </p>
                  <p className="font-semibold">{selectedRouteSheet.position}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    Отдел
                  </p>
                  <p className="font-semibold">{selectedRouteSheet.department}</p>
                </div>
              </div>
            </div>

            {/* Маршрут прохождения */}
            <div>
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Маршрут прохождения осмотра
              </h4>
              {selectedRouteSheet.services && selectedRouteSheet.services.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedRouteSheet.services.map((service, index) => (
                    <div
                      key={service.id || index}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        service.status === 'completed'
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                            service.status === 'completed'
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-lg">{service.name}</p>
                              {service.status === 'completed' && (
                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                              {service.cabinet && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>Кабинет: {service.cabinet}</span>
                                </div>
                              )}
                              {service.time && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>Время: {service.time}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {service.status === 'pending' && (
                            <button
                              onClick={() => {
                                workflowStoreAPI.addToQueueFromRouteSheet(selectedRouteSheet.id, service.id)
                                  .then(() => showToast('Пациент добавлен в очередь', 'success'))
                                  .catch((e: any) => showToast(e.message || 'Ошибка добавления в очередь', 'error'));
                              }}
                              className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                              title="Добавить в очередь"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          )}
                          {canEditService(service) ? (
                            <button
                              onClick={() => handleToggleService(selectedRouteSheet.id, service.id, service.status)}
                              className={`p-2 rounded-lg transition-colors ${
                                service.status === 'completed'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                              title={service.status === 'completed' ? 'Отметить как невыполненное' : 'Отметить как выполненное'}
                            >
                              <CheckSquare className="h-5 w-5" />
                            </button>
                          ) : (
                            <div className="p-2" title="Только врач соответствующей специализации может отмечать услуги">
                              {service.status === 'completed' ? (
                                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Услуги не назначены</p>
                </div>
              )}
            </div>

            {/* Лабораторные исследования */}
            {laboratoryTests.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <FlaskConical className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Лабораторные исследования
                  </h4>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {laboratoryTests.map((test) => (
                    <div
                      key={test.id}
                      className={`p-3 rounded-lg border ${
                        test.status === 'completed'
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{test.test_name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{test.test_type}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          test.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                          test.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                          {test.status === 'completed' ? 'Завершено' :
                           test.status === 'in_progress' ? 'В процессе' : 'Ожидает'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Функциональные исследования */}
            {functionalTests.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    Функциональные исследования
                  </h4>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {functionalTests.map((test) => (
                    <div
                      key={test.id}
                      className={`p-3 rounded-lg border ${
                        test.status === 'completed'
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{test.test_name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{test.test_type}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          test.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                          test.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                        }`}>
                          {test.status === 'completed' ? 'Завершено' :
                           test.status === 'in_progress' ? 'В процессе' : 'Ожидает'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Прогресс */}
            {selectedRouteSheet.services.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Прогресс прохождения
                  </span>
                  <span className="text-sm font-semibold">
                    {getProgress(selectedRouteSheet).completed} / {getProgress(selectedRouteSheet).total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${getProgress(selectedRouteSheet).percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* QR код */}
            {qrCodeUrl && (
              <div className="text-center border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="inline-block p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR код маршрутного листа" 
                    className="w-32 h-32 mx-auto"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    QR-код для идентификации пациента
                  </p>
                </div>
              </div>
            )}

            {/* Кнопка печати */}
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Печать
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}