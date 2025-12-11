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

export default function ContractContingentPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const contractId = params.contractId as string;
  
  const [contract, setContract] = useState<any>(null);
  const [contingent, setContingent] = useState<ContingentEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    if (contractId) {
      loadData();
    }
  }, [contractId]);

  const loadData = async () => {
    try {
      // Загружаем информацию о договоре
      const contracts = await workflowStoreAPI.getContracts();
      const foundContract = contracts.find((c: any) => c.id.toString() === contractId);
      
      if (!foundContract) {
        showToast('Договор не найден', 'error');
        router.push('/dashboard/clinic/contracts');
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const result = await workflowStoreAPI.uploadExcelContingent(file, contractId);
      
      // Перезагружаем данные
      const updatedContingent = await workflowStoreAPI.getContingentByContract(contractId);
      setContingent(updatedContingent);
      
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
      
      setShowUploadModal(false);
    } catch (error: any) {
      showToast(error.message || 'Ошибка загрузки файла', 'error');
    } finally {
      setIsUploading(false);
      e.target.value = '';
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

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого сотрудника?')) return;
    
    try {
      await workflowStoreAPI.deleteContingentEmployee(employeeId);
      // Перезагружаем данные
      const updatedContingent = await workflowStoreAPI.getContingentByContract(contractId);
      setContingent(updatedContingent);
      showToast('Сотрудник успешно удален', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка удаления', 'error');
    }
  };

  // Фильтрация
  const filteredContingent = contingent.filter(employee => {
    const searchLower = searchQuery.toLowerCase();
    return !searchQuery || 
      employee.name.toLowerCase().includes(searchLower) ||
      employee.position.toLowerCase().includes(searchLower) ||
      employee.department.toLowerCase().includes(searchLower) ||
      employee.iin?.toLowerCase().includes(searchLower);
  });

  // Пагинация
  const totalPages = Math.ceil(filteredContingent.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedContingent = filteredContingent.slice(startIndex, endIndex);

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
              Договор №{contract?.contract_number} - {contingent.length} сотрудников
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
            placeholder="Поиск по ФИО, должности, подразделению, ИИН..."
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
                {contingent.length}
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
              <p className="text-sm text-gray-600 dark:text-gray-400">Найдено</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {filteredContingent.length}
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
                {new Set(contingent.map(emp => emp.department)).size}
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
            Список сотрудников ({filteredContingent.length})
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Показано: {paginatedContingent.length} из {filteredContingent.length}
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
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Подразделение</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">ИИН</th>
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
                    <td className="py-3 px-4 text-gray-900 dark:text-white">{employee.iin || 'Не указан'}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">{employee.phone || 'Не указан'}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
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
            <label htmlFor="file-upload">
              <Button as="span" disabled={isUploading}>
                {isUploading ? 'Загрузка...' : 'Выбрать файл'}
              </Button>
            </label>
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>Поддерживаемые форматы: .xlsx, .xls</p>
            <p>Максимальный размер файла: 10 МБ</p>
          </div>
        </div>
      </Modal>
        </div>
      </main>
    </div>
  );
}