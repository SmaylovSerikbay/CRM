'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { QrCode, Search, FileText, Printer, CheckCircle, AlertCircle, User, Calendar, Building2, Briefcase, Clock, MapPin, CheckSquare, FlaskConical, Activity, ExternalLink, Plus, Scan, X } from 'lucide-react';
import { workflowStoreAPI } from '@/lib/store/workflow-store-api';
import { userStore } from '@/lib/store/user-store';

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
  const [searchValue, setSearchValue] = useState('');
  const [routeSheets, setRouteSheets] = useState<RouteSheet[]>([]);
  const [selectedRouteSheet, setSelectedRouteSheet] = useState<RouteSheet | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentDoctor, setCurrentDoctor] = useState<any>(null);
  const [laboratoryTests, setLaboratoryTests] = useState<any[]>([]);
  const [functionalTests, setFunctionalTests] = useState<any[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannedQRData, setScannedQRData] = useState<string>('');

  // Загружаем информацию о текущем пользователе и враче
  useEffect(() => {
    const user = userStore.getCurrentUser();
    setCurrentUser(user);
    
    if (user && user.role === 'clinic' && user.clinicRole === 'doctor') {
      // Загружаем информацию о враче
      // Врачи принадлежат клинике через user_id, поэтому получаем всех врачей клиники
      // и берем первого (в будущем можно добавить связь user-doctor через registration_data)
      workflowStoreAPI.getDoctors().then(doctors => {
        if (doctors.length > 0) {
          // Берем первого врача клиники (в идеале нужно связать через registration_data)
          setCurrentDoctor(doctors[0]);
        }
      }).catch(console.error);
    }
  }, []);

  useEffect(() => {
    const loadRouteSheets = async () => {
      try {
        const sheets = await workflowStoreAPI.getRouteSheets();
        setRouteSheets(sheets);
        if (sheets.length > 0 && !selectedRouteSheet) {
          setSelectedRouteSheet(sheets[0]);
        }
      } catch (error) {
        console.error('Error loading route sheets:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadRouteSheets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadTests = async () => {
      if (selectedRouteSheet) {
        try {
          const [labTests, funcTests] = await Promise.all([
            workflowStoreAPI.getLaboratoryTests(selectedRouteSheet.patientId, selectedRouteSheet.id),
            workflowStoreAPI.getFunctionalTests(selectedRouteSheet.patientId, selectedRouteSheet.id),
          ]);
          setLaboratoryTests(labTests);
          setFunctionalTests(funcTests);
          
          // Загружаем QR-код
          if (selectedRouteSheet.id) {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
            const qrUrl = `${apiUrl}/route-sheets/${selectedRouteSheet.id}/generate_qr_code/`;
            setQrCodeUrl(qrUrl);
          }
        } catch (error) {
          console.error('Error loading tests:', error);
        }
      } else {
        setQrCodeUrl(null);
      }
    };
    loadTests();
  }, [selectedRouteSheet]);

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      setError('Введите номер телефона пациента');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const sheet = await workflowStoreAPI.generateRouteSheet(searchValue);
      if (sheet) {
        setSelectedRouteSheet(sheet);
        // Обновляем список
        const updated = await workflowStoreAPI.getRouteSheets();
        setRouteSheets(updated);
        setSearchValue('');
      } else {
        setError('Пациент не найден. Проверьте номер телефона. Убедитесь, что для пациента есть утвержденный календарный план.');
      }
    } catch (error: any) {
      console.error('Error generating route sheet:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Ошибка поиска маршрутного листа';
      setError(errorMessage);
    } finally {
      setIsSearching(false);
    }
  };

  const handleQRScan = async (qrData: string) => {
    setIsSearching(true);
    setError(null);
    setShowQRScanner(false);

    try {
      // Ищем сотрудника по QR-коду
      const result = await workflowStoreAPI.findEmployeeByQR(qrData);
      
      if (result.found && result.employee) {
        const employee = result.employee;
        // Используем ИИН или ФИО для поиска/создания маршрутного листа
        const searchValue = employee.iin || employee.name;
        setSearchValue(searchValue);
        
        const sheet = await workflowStoreAPI.generateRouteSheet(searchValue);
        if (sheet) {
          setSelectedRouteSheet(sheet);
          const updated = await workflowStoreAPI.getRouteSheets();
          setRouteSheets(updated);
          setSearchValue('');
          setScannedQRData('');
        } else {
          setError('Не удалось создать маршрутный лист. Убедитесь, что для сотрудника есть утвержденный календарный план.');
        }
      } else {
        setError('Сотрудник не найден в базе данных');
      }
    } catch (error: any) {
      console.error('Error scanning QR:', error);
      setError(error.message || 'Ошибка при сканировании QR-кода');
    } finally {
      setIsSearching(false);
    }
  };

  const canEditService = (service: any): boolean => {
    // Только врачи могут редактировать
    if (!currentUser || currentUser.role !== 'clinic' || currentUser.clinicRole !== 'doctor') {
      return false;
    }
    
    // Проверяем соответствие специализации
    if (currentDoctor) {
      const serviceSpecialization = service.specialization || service.name;
      return currentDoctor.specialization === serviceSpecialization;
    }
    
    return false;
  };

  const handleToggleService = async (serviceId: string, currentStatus: string) => {
    if (!selectedRouteSheet) return;

    const service = selectedRouteSheet.services.find(s => s.id === serviceId);
    if (!service) return;

    // Проверка прав доступа на фронтенде
    if (!canEditService(service)) {
      alert('Вы можете отмечать только услуги по вашей специализации. Клиника может только просматривать статус.');
      return;
    }

    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    try {
      await workflowStoreAPI.updateRouteSheetServiceStatus(selectedRouteSheet.id, serviceId, newStatus);
      
      // Обновляем локальное состояние
      const updatedServices = selectedRouteSheet.services.map(s =>
        s.id === serviceId ? { ...s, status: newStatus as 'pending' | 'completed' } : s
      );
      
      setSelectedRouteSheet({
        ...selectedRouteSheet,
        services: updatedServices,
      });

      // Обновляем в списке
      const updatedSheets = routeSheets.map(sheet =>
        sheet.id === selectedRouteSheet.id
          ? { ...sheet, services: updatedServices }
          : sheet
      );
      setRouteSheets(updatedSheets);
    } catch (error: any) {
      console.error('Error updating service status:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Ошибка обновления статуса услуги';
      alert(errorMessage);
    }
  };

  const handleAddToQueue = async (serviceId: string) => {
    if (!selectedRouteSheet) return;
    
    try {
      await workflowStoreAPI.addToQueueFromRouteSheet(selectedRouteSheet.id, serviceId);
      alert('Пациент добавлен в очередь');
    } catch (error: any) {
      alert(error.message || 'Ошибка добавления в очередь');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredSheets = filterDate
    ? routeSheets.filter(sheet => sheet.visitDate === filterDate)
    : routeSheets;

  const completedServicesCount = selectedRouteSheet
    ? selectedRouteSheet.services.filter(s => s.status === 'completed').length
    : 0;
  const totalServicesCount = selectedRouteSheet ? selectedRouteSheet.services.length : 0;

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
              <h1 className="text-2xl font-bold">Маршрутные листы</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Создание и управление маршрутными листами для пациентов
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Поиск и фильтры */}
        <Card className="mb-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-3">Поиск пациента</h2>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                    label="Номер телефона пациента"
                value={searchValue}
                    onChange={(e) => {
                      setSearchValue(e.target.value);
                      setError(null);
                    }}
                    placeholder="Введите номер телефона (например: +7 777 123 4567 или 87771234567)"
                type="tel"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Поиск по ФИО или ИИН. Или отсканируйте QR-код сотрудника. Маршрут создается автоматически на основе должности и вредных факторов.
                  </p>
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowQRScanner(true)}
              >
                <Scan className="h-4 w-4 mr-2" />
                Сканировать QR
              </Button>
              <Button
                onClick={handleSearch}
                isLoading={isSearching}
                disabled={!searchValue.trim()}
              >
                <Search className="h-4 w-4 mr-2" />
                Найти
              </Button>
            </div>
          </div>
          {error && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
            </div>

            {routeSheets.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Фильтр по дате визита
                </label>
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="max-w-xs"
                />
                {filterDate && (
                  <button
                    onClick={() => setFilterDate('')}
                    className="ml-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Сбросить фильтр
                  </button>
                )}
              </div>
            )}
          </div>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
        {/* Список маршрутных листов */}
          <div className="lg:col-span-1">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Список листов</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {filteredSheets.length} {filteredSheets.length === 1 ? 'лист' : filteredSheets.length < 5 ? 'листа' : 'листов'}
                </span>
              </div>
              {filteredSheets.length > 0 ? (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredSheets.map((sheet) => {
                    const completed = sheet.services.filter(s => s.status === 'completed').length;
                    const total = sheet.services.length;
                    return (
                <div
                  key={sheet.id}
                  onClick={() => setSelectedRouteSheet(sheet)}
                        className={`p-4 rounded-lg cursor-pointer transition-all border-2 ${
                    selectedRouteSheet?.id === sheet.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                  }`}
                >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {sheet.patientName}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {sheet.iin}
                      </p>
                    </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(sheet.visitDate).toLocaleDateString('ru-RU')}
                            </div>
                            {total > 0 && (
                              <div className="text-xs mt-1">
                                <span className={completed === total ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}>
                                  {completed}/{total}
                    </span>
                  </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <Briefcase className="h-3 w-3" />
                          <span>{sheet.position}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {filterDate ? 'Нет листов на выбранную дату' : 'Нет созданных маршрутных листов'}
                  </p>
            </div>
              )}
          </Card>
          </div>

        {/* Маршрутный лист */}
          <div className="lg:col-span-2">
        {selectedRouteSheet ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="print:block"
          >
            <Card className="print:shadow-none print:border-0">
              <div className="flex items-center justify-between mb-6 print:hidden">
                    <div>
                <h2 className="text-xl font-semibold">Маршрутный лист</h2>
                      {totalServicesCount > 0 && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Пройдено: {completedServicesCount} из {totalServicesCount}
                        </p>
                      )}
                    </div>
                <Button onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Печать
                </Button>
              </div>

              <div className="space-y-6">
                {/* Заголовок */}
                <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-4">
                  <h3 className="text-2xl font-bold mb-2">МАРШРУТНЫЙ ЛИСТ</h3>
                      <div className="flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Дата визита: {new Date(selectedRouteSheet.visitDate).toLocaleDateString('ru-RU')}</span>
                        </div>
                      </div>
                </div>

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
                  <div className="space-y-3">
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
                                      onClick={() => handleAddToQueue(service.id)}
                                      className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors print:hidden"
                                      title="Добавить в очередь"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </button>
                                  )}
                                  {canEditService(service) ? (
                                    <button
                                      onClick={() => handleToggleService(service.id, service.status)}
                                      className={`p-2 rounded-lg transition-colors print:hidden ${
                                        service.status === 'completed'
                                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                      }`}
                                      title={service.status === 'completed' ? 'Отметить как невыполненное' : 'Отметить как выполненное'}
                                    >
                                    <CheckSquare className="h-5 w-5" />
                                  </button>
                                ) : (
                                  <div className="p-2 print:hidden" title="Только врач соответствующей специализации может отмечать услуги">
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
                          <p className="text-sm mt-1">Маршрут будет сформирован автоматически при создании листа</p>
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
                          <a
                            href="/dashboard/clinic/laboratory-tests"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            Все исследования
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <div className="space-y-2">
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
                          <a
                            href="/dashboard/clinic/functional-tests"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            Все исследования
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <div className="space-y-2">
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
                    {totalServicesCount > 0 && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Прогресс прохождения
                          </span>
                          <span className="text-sm font-semibold">
                            {completedServicesCount} / {totalServicesCount}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <div
                            className="bg-green-500 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${(completedServicesCount / totalServicesCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* QR код */}
                    <div className="text-center border-t border-gray-200 dark:border-gray-700 pt-6 print:block">
                  <div className="inline-block p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    {qrCodeUrl ? (
                      <img 
                        src={qrCodeUrl} 
                        alt="QR код маршрутного листа" 
                        className="w-32 h-32 mx-auto"
                      />
                    ) : (
                      <QrCode className="h-32 w-32 mx-auto text-gray-400" />
                    )}
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                          QR-код для идентификации пациента
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Отсканируйте для быстрого доступа к маршрутному листу
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ) : (
          <Card>
            <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Маршрутный лист не выбран</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Найдите пациента по номеру телефона, чтобы создать или просмотреть маршрутный лист
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 max-w-md mx-auto text-left">
                    <p className="text-sm font-semibold mb-2">Как это работает:</p>
                    <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                      <li>1. Введите номер телефона пациента</li>
                      <li>2. Система найдет пациента и создаст маршрутный лист</li>
                      <li>3. Маршрут формируется автоматически на основе должности</li>
                      <li>4. Отмечайте пройденные услуги по мере осмотра</li>
                    </ul>
                  </div>
            </div>
          </Card>
        )}

        {/* QR Scanner Modal */}
        {showQRScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Сканирование QR-кода</h3>
                  <button
                    onClick={() => {
                      setShowQRScanner(false);
                      setScannedQRData('');
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="mb-4">
                  <Input
                    label="Вставьте данные QR-кода"
                    value={scannedQRData}
                    onChange={(e) => setScannedQRData(e.target.value)}
                    placeholder='{"type":"employee","employee_id":"1","iin":"...","name":"..."}'
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Вставьте JSON данные из QR-кода сотрудника или отсканируйте QR-код камерой
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      if (scannedQRData.trim()) {
                        handleQRScan(scannedQRData.trim());
                      } else {
                        setError('Введите данные QR-кода');
                      }
                    }}
                    disabled={!scannedQRData.trim()}
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
            </Card>
          </div>
        )}
          </div>
        </div>
      </main>
    </div>
  );
}
