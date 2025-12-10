'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Download, Search, Building2, Users, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { workflowStoreAPI } from '@/lib/store/workflow-store-api';
import { useToast } from '@/components/ui/Toast';

interface Counterparty {
  id: string;
  bin: string;
  clinic_name: string;
  phone: string;
  email: string;
  created_at: string;
  registration_completed: boolean;
}

export default function CounterpartiesPage() {
  const { showToast } = useToast();
  const [clinics, setClinics] = useState<Counterparty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  // Фильтры и поиск
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    loadClinics();
  }, []);

  const loadClinics = async () => {
    try {
      // Получаем всех пользователей и фильтруем клиники
      const users = await workflowStoreAPI.getUsers();
      const clinicsList = users
        .filter((user: any) => user.role === 'clinic')
        .map((user: any) => ({
          id: user.id,
          bin: user.registration_data?.bin || '',
          clinic_name: user.registration_data?.clinic_name || user.username,
          phone: user.phone,
          email: user.email || '',
          created_at: user.created_at,
          registration_completed: user.registration_completed,
        }));
      
      setClinics(clinicsList);
    } catch (error) {
      console.error('Error loading clinics:', error);
      showToast('Ошибка загрузки контрагентов', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (clinics.length === 0) {
      showToast('Нет данных для экспорта', 'warning');
      return;
    }

    setIsExporting(true);
    try {
      await workflowStoreAPI.exportClinicsExcel();
      showToast('Файл успешно загружен', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка экспорта', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Фильтрация
  const filteredClinics = clinics.filter((clinic) => {
    const matchesSearch = searchQuery === '' || 
      clinic.bin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.clinic_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.phone.includes(searchQuery);
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'completed' && clinic.registration_completed) ||
      (statusFilter === 'incomplete' && !clinic.registration_completed);
    
    return matchesSearch && matchesStatus;
  });

  // Пагинация
  const totalPages = Math.ceil(filteredClinics.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClinics = filteredClinics.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 flex-shrink-0 shadow-sm">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Контрагенты</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Список клиник
              </p>
            </div>
            <div className="flex items-center gap-4">
              {clinics.length > 0 && (
                <Button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Экспорт...' : 'Экспорт в Excel'}
                </Button>
              )}
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {filteredClinics.length}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {filteredClinics.length === clinics.length ? 'Всего контрагентов' : 'Найдено'}
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
                  placeholder="Поиск по БИН, названию или телефону..."
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
              </Button>
            </div>

            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Статус:
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">Все</option>
                    <option value="completed">Регистрация завершена</option>
                    <option value="incomplete">Регистрация не завершена</option>
                  </select>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {clinics.length === 0 ? (
            <Card className="p-8 text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Нет контрагентов
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Контрагенты появятся после регистрации клиник в системе
              </p>
            </Card>
          ) : (
            <>
              <div className="grid gap-4">
                {paginatedClinics.map((clinic) => (
                  <Card key={clinic.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                          <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {clinic.clinic_name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                            <span>БИН: {clinic.bin}</span>
                            <span>Телефон: {clinic.phone}</span>
                            {clinic.email && <span>Email: {clinic.email}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          clinic.registration_completed
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {clinic.registration_completed ? 'Регистрация завершена' : 'Регистрация не завершена'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Дата регистрации: {new Date(clinic.created_at).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Пагинация */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Показано {startIndex + 1}-{Math.min(endIndex, filteredClinics.length)} из {filteredClinics.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {currentPage} из {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}