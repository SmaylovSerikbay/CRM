'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search, Filter, Download, Eye, Calendar, User, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { workflowStoreAPI } from '@/lib/store/workflow-store-api';
import { useToast } from '@/components/ui/Toast';

interface RouteSheet {
  id: string;
  patientId: string;
  patientName: string;
  contractId?: string;
  contractNumber?: string;
  employerName?: string;
  clinicName?: string;
  createdAt: string;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  examinations: any[];
  totalExaminations: number;
  completedExaminations: number;
}

export default function RouteSheetsPage() {
  const { showToast } = useToast();
  const [routeSheets, setRouteSheets] = useState<RouteSheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    loadRouteSheets();
  }, []);

  const loadRouteSheets = async () => {
    try {
      const data = await workflowStoreAPI.getRouteSheets();
      // Маппим данные в нужный формат
      const mappedSheets: RouteSheet[] = data.map((sheet: any) => ({
        id: sheet.id.toString(),
        patientId: sheet.patientId || sheet.patient_id,
        patientName: sheet.patientName || sheet.patient_name || 'Неизвестно',
        contractId: sheet.contractId || sheet.contract_id,
        contractNumber: sheet.contractNumber || sheet.contract_number,
        employerName: sheet.employerName || sheet.employer_name,
        clinicName: sheet.clinicName || sheet.clinic_name,
        createdAt: sheet.createdAt || sheet.created_at,
        status: sheet.status || 'draft',
        examinations: sheet.examinations || [],
        totalExaminations: sheet.totalExaminations || sheet.total_examinations || 0,
        completedExaminations: sheet.completedExaminations || sheet.completed_examinations || 0,
      }));
      setRouteSheets(mappedSheets);
    } catch (error) {
      console.error('Error loading route sheets:', error);
      showToast('Ошибка загрузки маршрутных листов', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Черновик',
      in_progress: 'В процессе',
      completed: 'Завершен',
      cancelled: 'Отменен',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getProgressPercentage = (sheet: RouteSheet) => {
    if (sheet.totalExaminations === 0) return 0;
    return Math.round((sheet.completedExaminations / sheet.totalExaminations) * 100);
  };

  // Фильтрация
  const filteredSheets = routeSheets.filter((sheet) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      sheet.patientName.toLowerCase().includes(searchLower) ||
      sheet.contractNumber?.toLowerCase().includes(searchLower) ||
      sheet.employerName?.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === 'all' || sheet.status === statusFilter;

    let matchesDate = true;
    if (dateFromFilter || dateToFilter) {
      const sheetDate = new Date(sheet.createdAt);
      sheetDate.setHours(0, 0, 0, 0);
      
      if (dateFromFilter) {
        const fromDate = new Date(dateFromFilter);
        fromDate.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && sheetDate >= fromDate;
      }
      
      if (dateToFilter) {
        const toDate = new Date(dateToFilter);
        toDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && sheetDate <= toDate;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Пагинация
  const totalPages = Math.ceil(filteredSheets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSheets = filteredSheets.slice(startIndex, endIndex);

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Маршрутные листы
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Управление маршрутными листами пациентов
          </p>
        </div>
        <Button onClick={() => window.location.reload()}>
          Обновить
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Всего листов</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {routeSheets.length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">В процессе</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {routeSheets.filter(s => s.status === 'in_progress').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Завершено</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {routeSheets.filter(s => s.status === 'completed').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Отменено</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {routeSheets.filter(s => s.status === 'cancelled').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Поиск и фильтры */}
      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Поиск по пациенту, договору, работодателю..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Фильтры
            </Button>
            {(searchQuery || statusFilter !== 'all' || dateFromFilter || dateToFilter) && (
              <Button variant="outline" onClick={resetFilters}>
                Сбросить
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Статус
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">Все статусы</option>
                  <option value="draft">Черновик</option>
                  <option value="in_progress">В процессе</option>
                  <option value="completed">Завершен</option>
                  <option value="cancelled">Отменен</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Дата от
                </label>
                <Input
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Дата до
                </label>
                <Input
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Список маршрутных листов */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Маршрутные листы ({filteredSheets.length})
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Показано: {paginatedSheets.length} из {filteredSheets.length}
          </div>
        </div>
        
        {paginatedSheets.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {searchQuery || statusFilter !== 'all' || dateFromFilter || dateToFilter
              ? 'Маршрутные листы не найдены'
              : 'Маршрутные листы отсутствуют'
            }
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedSheets.map((sheet) => (
              <motion.div
                key={sheet.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {sheet.patientName}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sheet.status)}`}>
                        {getStatusLabel(sheet.status)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>Договор: {sheet.contractNumber || 'Не указан'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Работодатель: {sheet.employerName || 'Не указан'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Создан: {new Date(sheet.createdAt).toLocaleDateString('ru-RU')}</span>
                      </div>
                    </div>
                    
                    {sheet.totalExaminations > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600 dark:text-gray-400">
                            Прогресс осмотров
                          </span>
                          <span className="font-medium">
                            {sheet.completedExaminations} / {sheet.totalExaminations} ({getProgressPercentage(sheet)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${getProgressPercentage(sheet)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
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
    </div>
  );
}