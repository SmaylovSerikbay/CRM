'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Upload, FileSpreadsheet, CheckCircle, ArrowRight, Download, Edit2, Trash2, X, Save, QrCode, Filter, List, Grid, ChevronDown, ChevronRight, Search, Calendar, Clock, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { workflowStoreAPI, ContingentEmployee } from '@/lib/store/workflow-store-api';
import { userStore } from '@/lib/store/user-store';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

export default function ClinicContingentPage() {
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ContingentEmployee>>({});
  const [qrCodeModal, setQrCodeModal] = useState<{ employeeId: string; qrUrl: string } | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contractsLoaded, setContractsLoaded] = useState(false);
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Ленивая загрузка договоров
  const loadContractsIfNeeded = async () => {
    if (!contractsLoaded) {
      try {
        const contractsData = await workflowStoreAPI.getContracts();
        const approvedContracts = contractsData.filter((c: any) => c.status === 'approved' || c.status === 'executed');
        setContracts(approvedContracts);
        setContractsLoaded(true);
      } catch (error) {
        console.error('Error loading contracts:', error);
        showToast('Ошибка загрузки договоров', 'error');
      }
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // Загружаем только контингент
        const data = await workflowStoreAPI.getContingent();
        setEmployees(data);
        
        // Загружаем договоры только если нужно для фильтрации
        if (filterContractId || selectedContractId) {
          const contractsData = await workflowStoreAPI.getContracts();
          const approvedContracts = contractsData.filter((c: any) => c.status === 'approved' || c.status === 'executed');
          setContracts(approvedContracts);
        }
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
      
      // Закрываем модальное окно после успешной загрузки
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadSuccess(false);
      }, 2000);
    } catch (error: any) {
      showToast(error.message || 'Ошибка загрузки файла', 'error');
    } finally {
      setIsUploading(false);
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
      totalExperienceYears: (employee as any).totalExperienceYears,
      positionExperienceYears: (employee as any).positionExperienceYears,
      lastExaminationDate: employee.lastExaminationDate,
      harmfulFactors: employee.harmfulFactors,
      notes: (employee as any).notes,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    
    try {
      const user = userStore.getCurrentUser();
      await workflowStoreAPI.updateContingentEmployee(user?.id || '', editingId, editData);
      const updated = await workflowStoreAPI.getContingent();
      setEmployees(updated);
      setEditingId(null);
      setEditData({});
      setShowEditModal(false);
      showToast('Изменения успешно сохранены', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка сохранения', 'error');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
    setShowEditModal(false);
  };

  // Фильтрация и группировка
  const getFilteredEmployees = (): ContingentEmployee[] => {
    let filtered = employees;
    if (filterContractId) {
      filtered = filtered.filter(emp => emp.contractId === filterContractId);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.name?.toLowerCase().includes(query) ||
        emp.position?.toLowerCase().includes(query) ||
        emp.department?.toLowerCase().includes(query) ||
        (emp as any).notes?.toLowerCase().includes(query)
      );
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
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold">Список контингента</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Управление списком сотрудников
              </p>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Всего: {employees.length} | Показано: {filteredEmployees.length}
              </div>
              <Button onClick={() => {
                loadContractsIfNeeded();
                setShowUploadModal(true);
              }}>
                <Upload className="h-4 w-4 mr-2" />
                Загрузить файл
              </Button>
            </div>
          </div>
          
          {/* Поиск */}
          {employees.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                type="text"
                placeholder="Поиск по ФИО, должности, объекту..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
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
                    onFocus={loadContractsIfNeeded}
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
                      <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">Дата медосмотра</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">Врач (ФИО / Специализация)</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">Время</th>
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
                              {employee.routeSheetInfo?.visit_date ? (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                  <span className="text-xs">{new Date(employee.routeSheetInfo.visit_date).toLocaleDateString('ru-RU')}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="py-2 px-2">
                              {employee.routeSheetInfo?.doctors && employee.routeSheetInfo.doctors.length > 0 ? (
                                <div className="space-y-1">
                                  {employee.routeSheetInfo.doctors.slice(0, 2).map((doctor, idx) => (
                                    <div key={idx} className="text-xs">
                                      <div className="font-medium text-gray-900 dark:text-white">{doctor.name}</div>
                                      <div className="text-gray-500 dark:text-gray-400">{doctor.specialization}</div>
                                    </div>
                                  ))}
                                  {employee.routeSheetInfo.doctors.length > 2 && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      +{employee.routeSheetInfo.doctors.length - 2} еще
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="py-2 px-2">
                              {employee.routeSheetInfo?.time_range ? (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                  <span className="text-xs">{employee.routeSheetInfo.time_range}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={Array.isArray(editData.harmfulFactors) ? editData.harmfulFactors.join(', ') : ''}
                                onChange={(e) => setEditData({ ...editData, harmfulFactors: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-800"
                                placeholder="через запятую"
                              />
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
                              {employee.routeSheetInfo?.visit_date ? (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                  <span className="text-xs">{new Date(employee.routeSheetInfo.visit_date).toLocaleDateString('ru-RU')}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="py-2 px-2">
                              {employee.routeSheetInfo?.doctors && employee.routeSheetInfo.doctors.length > 0 ? (
                                <div className="space-y-1">
                                  {employee.routeSheetInfo.doctors.slice(0, 2).map((doctor, idx) => (
                                    <div key={idx} className="text-xs">
                                      <div className="font-medium text-gray-900 dark:text-white">{doctor.name}</div>
                                      <div className="text-gray-500 dark:text-gray-400">{doctor.specialization}</div>
                                    </div>
                                  ))}
                                  {employee.routeSheetInfo.doctors.length > 2 && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      +{employee.routeSheetInfo.doctors.length - 2} еще
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="py-2 px-2">
                              {employee.routeSheetInfo?.time_range ? (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                  <span className="text-xs">{employee.routeSheetInfo.time_range}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
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
                              <td colSpan={16} className="py-3 px-4">
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
                                            {contract.employer_name || `БИН: ${contract.employer_bin}`}
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
                                  {employee.routeSheetInfo?.visit_date ? (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                      <span className="text-xs">{new Date(employee.routeSheetInfo.visit_date).toLocaleDateString('ru-RU')}</span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </td>
                                <td className="py-2 px-2">
                                  {employee.routeSheetInfo?.doctors && employee.routeSheetInfo.doctors.length > 0 ? (
                                    <div className="space-y-1">
                                      {employee.routeSheetInfo.doctors.slice(0, 2).map((doctor, idx) => (
                                        <div key={idx} className="text-xs">
                                          <div className="font-medium text-gray-900 dark:text-white">{doctor.name}</div>
                                          <div className="text-gray-500 dark:text-gray-400">{doctor.specialization}</div>
                                        </div>
                                      ))}
                                      {employee.routeSheetInfo.doctors.length > 2 && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          +{employee.routeSheetInfo.doctors.length - 2} еще
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </td>
                                <td className="py-2 px-2">
                                  {employee.routeSheetInfo?.time_range ? (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                      <span className="text-xs">{employee.routeSheetInfo.time_range}</span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </td>
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

        {/* Модальное окно загрузки файла */}
        <Modal
          isOpen={showUploadModal}
          onClose={() => {
            setShowUploadModal(false);
            setUploadSuccess(false);
          }}
          title="Загрузка списка контингента"
          size="xl"
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Загрузите Excel-файл со списком сотрудников. Система автоматически присвоит вредные факторы.
              </p>
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
            
            {uploadSuccess && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <p className="text-green-700 dark:text-green-300">
                  Файл успешно загружен! Вредные факторы автоматически присвоены {employees.length} сотрудникам.
                </p>
              </div>
            )}

            {contracts.length > 0 ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Выберите договор для загрузки контингента:
                  </label>
                  <select
                    value={selectedContractId}
                    onChange={(e) => setSelectedContractId(e.target.value)}
                    onFocus={loadContractsIfNeeded}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">-- Выберите договор --</option>
                    {contracts.map((contract: any) => (
                      <option key={contract.id} value={contract.id}>
                        Договор №{contract.contract_number} от {new Date(contract.contract_date).toLocaleDateString('ru-RU')} - {contract.employer_name || `БИН: ${contract.employer_bin}`}{contract.status === 'executed' ? ' (Исполнен)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Контингент будет загружен для выбранного работодателя по договору
                  </p>
                </div>

                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <label className="cursor-pointer">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Выберите Excel-файл или перетащите сюда
                    </span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Поддерживаются файлы .xlsx, .xls. Формат согласно приказу №131: № п/п, ФИО, Дата рождения, Пол, Объект или участок, Занимаемая должность, Общий стаж, Стаж по занимаемой должности, Дата последнего медосмотра, Профессиональная вредность, Примечание
                  </p>
                  {isUploading && (
                    <div className="mt-4">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Обработка файла...</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-yellow-700 dark:text-yellow-300">
                  У вас нет подтвержденных договоров. Сначала необходимо создать и подтвердить договор с работодателем.
                </p>
              </div>
            )}
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

