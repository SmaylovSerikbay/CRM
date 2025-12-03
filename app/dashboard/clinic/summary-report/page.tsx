'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FileText, Download, Users, CheckCircle, AlertCircle, Clock, XCircle, TrendingUp, Calendar } from 'lucide-react';
import { workflowStoreAPI } from '@/lib/store/workflow-store-api';

export default function SummaryReportPage() {
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);

  useEffect(() => {
    loadReportData();
  }, [selectedDepartment, dateRange.startDate, dateRange.endDate]);

  const loadReportData = async () => {
    try {
      setIsLoading(true);
      // Используем существующий метод, но можно создать отдельный для сводного отчета
      const statsData: any = await workflowStoreAPI.getFinalActStats(selectedDepartment || undefined);
      
      // Дополнительная статистика для сводного отчета
      const expertises = await workflowStoreAPI.getExpertises();
      
      // Фильтруем по датам, если указаны
      let filteredExpertises = expertises;
      if (dateRange.startDate || dateRange.endDate) {
        filteredExpertises = expertises.filter((exp: any) => {
          if (!exp.verdictDate) return false;
          const verdictDate = new Date(exp.verdictDate);
          if (dateRange.startDate && verdictDate < new Date(dateRange.startDate)) return false;
          if (dateRange.endDate && verdictDate > new Date(dateRange.endDate)) return false;
          return true;
        });
      }

      // Подсчитываем статистику по группам здоровья
      const healthGroupsStats = {
        '1': 0,
        '2': 0,
        '3': 0,
        '4': 0,
        '5': 0,
        '6': 0,
      };

      filteredExpertises.forEach((exp: any) => {
        if (exp.healthGroup && healthGroupsStats[exp.healthGroup as keyof typeof healthGroupsStats] !== undefined) {
          healthGroupsStats[exp.healthGroup as keyof typeof healthGroupsStats]++;
        }
      });

      // Статистика по отделам
      const departmentStats: Record<string, any> = {};
      filteredExpertises.forEach((exp: any) => {
        if (!departmentStats[exp.department]) {
          departmentStats[exp.department] = {
            total: 0,
            healthy: 0,
            temporaryUnfit: 0,
            permanentUnfit: 0,
            healthGroups: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 },
          };
        }
        departmentStats[exp.department].total++;
        if (exp.finalVerdict === 'fit') departmentStats[exp.department].healthy++;
        if (exp.finalVerdict === 'temporary_unfit') departmentStats[exp.department].temporaryUnfit++;
        if (exp.finalVerdict === 'permanent_unfit') departmentStats[exp.department].permanentUnfit++;
        if (exp.healthGroup) {
          departmentStats[exp.department].healthGroups[exp.healthGroup]++;
        }
      });

      setReportData({
        ...statsData,
        healthGroupsStats,
        departmentStats,
        totalExpertises: filteredExpertises.length,
        dateRange: {
          start: dateRange.startDate,
          end: dateRange.endDate,
        },
      });
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsLoading(true);
      await workflowStoreAPI.exportSummaryReportPDF(
        selectedDepartment || undefined,
        dateRange.startDate || undefined,
        dateRange.endDate || undefined
      );
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      alert(`Ошибка экспорта: ${error.message || 'Неизвестная ошибка'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsLoading(true);
      await workflowStoreAPI.exportSummaryReportExcel(
        selectedDepartment || undefined,
        dateRange.startDate || undefined,
        dateRange.endDate || undefined
      );
    } catch (error: any) {
      console.error('Error exporting Excel:', error);
      alert(`Ошибка экспорта: ${error.message || 'Неизвестная ошибка'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getHealthGroupLabel = (group: string) => {
    const labels: Record<string, string> = {
      '1': 'Группа 1 - Здоровый',
      '2': 'Группа 2 - Практически здоровый',
      '3': 'Группа 3 - Имеет признаки воздействия ВПФ',
      '4': 'Группа 4 - Требует динамического наблюдения',
      '5': 'Группа 5 - Требует лечения',
      '6': 'Группа 6 - Требует реабилитации/профпатологии',
    };
    return labels[group] || group;
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
              <h1 className="text-2xl font-bold">Сводный отчет</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Промежуточная статистика по проведенным медицинским осмотрам (п. 17 приказа)
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportExcel}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Фильтры */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Отдел
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              >
                <option value="">Все отделы</option>
                {availableDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Дата начала
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Дата окончания
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </Card>

        {/* Общая статистика */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Всего осмотрено</p>
                <p className="text-2xl font-bold">{reportData?.totalExamined || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Здоровы</p>
                <p className="text-2xl font-bold text-green-600">{reportData?.healthy || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Временные противопоказания</p>
                <p className="text-2xl font-bold text-yellow-600">{reportData?.temporaryContraindications || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Постоянные противопоказания</p>
                <p className="text-2xl font-bold text-red-600">{reportData?.permanentContraindications || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Профзаболевания</p>
                <p className="text-2xl font-bold text-orange-600">{reportData?.occupationalDiseases || 0}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
        </div>

        {/* Распределение по группам здоровья */}
        {reportData?.healthGroupsStats && (
          <Card className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Распределение по группам здоровья</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(reportData.healthGroupsStats).map(([group, count]: [string, any]) => (
                <motion.div
                  key={group}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{getHealthGroupLabel(group)}</p>
                    <p className="text-xl font-bold">{count}</p>
                  </div>
                  <TrendingUp className="h-6 w-6 text-blue-500" />
                </motion.div>
              ))}
            </div>
          </Card>
        )}

        {/* Статистика по отделам */}
        {reportData?.departmentStats && Object.keys(reportData.departmentStats).length > 0 && (
          <Card>
            <h2 className="text-xl font-semibold mb-4">Статистика по отделам</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold">Отдел</th>
                    <th className="text-center py-3 px-4 font-semibold">Всего</th>
                    <th className="text-center py-3 px-4 font-semibold">Здоровы</th>
                    <th className="text-center py-3 px-4 font-semibold">Временные</th>
                    <th className="text-center py-3 px-4 font-semibold">Постоянные</th>
                    <th className="text-center py-3 px-4 font-semibold">Группы здоровья</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(reportData.departmentStats).map(([dept, stats]: [string, any]) => (
                    <motion.tr
                      key={dept}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-gray-200 dark:border-gray-700"
                    >
                      <td className="py-3 px-4 font-medium">{dept}</td>
                      <td className="text-center py-3 px-4">{stats.total}</td>
                      <td className="text-center py-3 px-4 text-green-600">{stats.healthy}</td>
                      <td className="text-center py-3 px-4 text-yellow-600">{stats.temporaryUnfit}</td>
                      <td className="text-center py-3 px-4 text-red-600">{stats.permanentUnfit}</td>
                      <td className="text-center py-3 px-4">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {Object.entries(stats.healthGroups).map(([group, count]: [string, any]) => (
                            count > 0 && (
                              <span
                                key={group}
                                className="px-2 py-1 text-xs rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                title={getHealthGroupLabel(group)}
                              >
                                {group}: {count}
                              </span>
                            )
                          ))}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {(!reportData || reportData.totalExamined === 0) && (
          <Card>
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Нет данных для отчета</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Данные появятся после завершения медицинских осмотров
              </p>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

