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

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого сотрудника?')) return;
    
    try {
      await workflowStoreAPI.deleteContingentEmployee(employeeId);
      // Перезагружаем данные без кэша для получения актуальных данных
      await loadData(currentPage, true); // Перезагружаем текущую страницу без кэша
      showToast('Сотрудник успешно удален', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка удаления', 'error');
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
        </div>
      </main>
    </div>
  );
}