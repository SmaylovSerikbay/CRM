'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Users, Search, Filter, Download, Upload, Plus, Edit, X, AlertCircle } from 'lucide-react';
import { workflowStoreAPI, ContingentEmployee } from '@/lib/store/workflow-store-api';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
import * as XLSX from 'xlsx';

export default function EmployerContractContingentPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const contractId = params.contractId as string;
  
  const [contract, setContract] = useState<any>(null);
  const [contingent, setContingent] = useState<ContingentEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [positionFilter, setPositionFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  useEffect(() => {
    if (contractId) {
      loadData();
    }
  }, [contractId]);

  const loadData = async () => {
    try {
      // Загружаем основную информацию о договоре
      const contracts = await workflowStoreAPI.getContracts();
      const foundContract = contracts.find((c: any) => c.id.toString() === contractId);
      
      if (!foundContract) {
        showToast('Договор не найден', 'error');
        router.push('/dashboard/employer/contracts');
        return;
      }

      setContract(foundContract);

      // Загружаем контингент для этого договора
      const contingentData = await workflowStoreAPI.getContingentByContract(contractId);
      setContingent(contingentData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Ошибка загрузки данных', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportContingent = async () => {
    try {
      if (filteredContingent.length === 0) {
        showToast('Нет данных для экспорта', 'warning');
        return;
      }

      const contingentData = filteredContingent.map(employee => ({
        'ФИО': employee.name,
        'Должность': employee.position,
        'Объект/участок': employee.department,
        'ИИН': employee.iin,
        'Телефон': employee.phone || '',
        'Дата рождения': employee.birthDate || '',
        'Пол': employee.gender === 'male' ? 'Мужской' : employee.gender === 'female' ? 'Женский' : '',
        'Вредные факторы': employee.harmfulFactors?.join(', ') || '',
        'Требует осмотра': employee.requiresExamination ? 'Да' : 'Нет',
        'Последний осмотр': employee.lastExaminationDate || '',
        'Следующий осмотр': employee.nextExaminationDate || '',
        'Общий стаж': employee.totalExperienceYears || '',
        'Стаж по должности': employee.positionExperienceYears || '',
        'Примечания': employee.notes || ''
      }));

      // Создаем Excel файл
      const ws = XLSX.utils.json_to_sheet(contingentData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Контингент');

      // Скачиваем файл
      const fileName = `Контингент_${contract?.contract_number}_${new Date().toLocaleDateString('ru-RU')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      showToast('Файл успешно загружен', 'success');
    } catch (error: any) {
      console.error('Export error:', error);
      showToast(error.message || 'Ошибка экспорта', 'error');
    }
  };

  // Фильтрация контингента
  const filteredContingent = contingent.filter(emp => {
    const matchesSearch = !searchQuery || 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.iin.includes(searchQuery) ||
      emp.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPosition = !positionFilter || 
      emp.position.toLowerCase().includes(positionFilter.toLowerCase());
    
    const matchesDepartment = !departmentFilter || 
      emp.department.toLowerCase().includes(departmentFilter.toLowerCase());
    
    return matchesSearch && matchesPosition && matchesDepartment;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Договор не найден
          </h2>
          <Link href="/dashboard/employer/contracts">
            <Button>Вернуться к списку договоров</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Хлебные крошки */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Link href="/dashboard/employer/contracts" className="hover:text-blue-600 dark:hover:text-blue-400">
              Договоры
            </Link>
            <span>/</span>
            <Link href={`/dashboard/employer/contracts/${contractId}`} className="hover:text-blue-600 dark:hover:text-blue-400">
              Договор №{contract.contract_number}
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white">Контингент</span>
          </div>

          {/* Заголовок */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/dashboard/employer/contracts/${contractId}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Назад к договору
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Контингент сотрудников
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Договор №{contract.contract_number} от {new Date(contract.contract_date).toLocaleDateString('ru-RU')}
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
              {filteredContingent.length > 0 && (
                <Button onClick={handleExportContingent} className="bg-green-600 hover:bg-green-700">
                  <Download className="h-4 w-4 mr-2" />
                  Экспорт в Excel
                </Button>
              )}
            </div>
          </div>

          {/* Поиск и фильтры */}
          <Card className="p-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Поиск по ФИО, ИИН, должности, участку..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Фильтры
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Input
                  placeholder="Фильтр по должности"
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                />
                <Input
                  placeholder="Фильтр по участку"
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                />
              </div>
            )}

            {(searchQuery || positionFilter || departmentFilter) && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Найдено: {filteredContingent.length} из {contingent.length} сотрудников
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setPositionFilter('');
                    setDepartmentFilter('');
                  }}
                >
                  Очистить фильтры
                </Button>
              </div>
            )}
          </Card>

          {/* Список контингента */}
          {filteredContingent.length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {contingent.length === 0 ? 'Контингент не загружен' : 'Ничего не найдено'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {contingent.length === 0 
                  ? 'Клиника еще не загрузила список сотрудников для этого договора'
                  : 'Попробуйте изменить параметры поиска или фильтры'
                }
              </p>
              {contingent.length === 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
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
              )}
              {contingent.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setPositionFilter('');
                    setDepartmentFilter('');
                  }}
                >
                  Очистить фильтры
                </Button>
              )}
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">ФИО</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Должность</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Объект/участок</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">ИИН</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Телефон</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Вредные факторы</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-400">Статус осмотра</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredContingent.map((employee, index) => (
                      <motion.tr
                        key={employee.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {employee.name}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {employee.position}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {employee.department}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {employee.iin}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {employee.phone || '—'}
                        </td>
                        <td className="px-4 py-3">
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
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            employee.requiresExamination 
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}>
                            {employee.requiresExamination ? 'Требует осмотра' : 'Не требует'}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Статистика */}
          {contingent.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {contingent.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Всего сотрудников
                </div>
              </Card>
              
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {contingent.filter(emp => emp.requiresExamination).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Требуют осмотра
                </div>
              </Card>
              
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {new Set(contingent.map(emp => emp.department)).size}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Участков/объектов
                </div>
              </Card>
              
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {new Set(contingent.map(emp => emp.position)).size}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Различных должностей
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}