'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Upload, FileSpreadsheet, CheckCircle, ArrowRight, Download, Edit2, Trash2, X, Save, QrCode } from 'lucide-react';
import Link from 'next/link';
import { workflowStoreAPI, ContingentEmployee } from '@/lib/store/workflow-store-api';
import { userStore } from '@/lib/store/user-store';
import { useRouter } from 'next/navigation';

export default function ContingentPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<ContingentEmployee[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ContingentEmployee>>({});
  const [qrCodeModal, setQrCodeModal] = useState<{ employeeId: string; qrUrl: string } | null>(null);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const data = await workflowStoreAPI.getContingent();
        setEmployees(data);
      } catch (error) {
        console.error('Error loading employees:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadEmployees();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setUploadSuccess(false);

    try {
      const result = await workflowStoreAPI.uploadExcelContingent(file);
      
      const updated = await workflowStoreAPI.getContingent();
      setEmployees(updated);
      setUploadSuccess(true);
      
      if (result.skipped > 0) {
        const reasons = result.skipped_reasons || {};
        const reasonsText = [
          reasons.duplicate ? `дубликаты: ${reasons.duplicate}` : '',
          reasons.no_name ? `нет ФИО: ${reasons.no_name}` : '',
        ].filter(Boolean).join(', ');
        alert(`Загружено: ${result.created}, пропущено (${reasonsText || 'разные причины'}): ${result.skipped}`);
      }
    } catch (error: any) {
      alert(error.message || 'Ошибка загрузки файла');
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
    } catch (error: any) {
      alert(error.message || 'Ошибка удаления');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Вы уверены, что хотите удалить ВСЕХ сотрудников? Это действие нельзя отменить!')) return;
    
    try {
      await workflowStoreAPI.deleteAllContingentEmployees();
      setEmployees([]);
      setUploadSuccess(false);
      alert('Все сотрудники удалены');
    } catch (error: any) {
      alert(error.message || 'Ошибка удаления');
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
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    
    try {
      await workflowStoreAPI.updateContingentEmployee(editingId, editData);
      const updated = await workflowStoreAPI.getContingent();
      setEmployees(updated);
      setEditingId(null);
      setEditData({});
    } catch (error: any) {
      alert(error.message || 'Ошибка сохранения');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleNextStep = () => {
    router.push('/dashboard/employer/calendar-plan');
  };

  return (
    <div>
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Список контингента</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Загрузите Excel-файл со списком сотрудников. Система автоматически присвоит вредные факторы.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-6 w-6 text-green-600 dark:text-green-400" />
                <h2 className="text-xl font-semibold">Загрузка списка контингента</h2>
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await workflowStoreAPI.downloadContingentTemplate();
                  } catch (error: any) {
                    alert(error.message || 'Ошибка скачивания шаблона');
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Скачать шаблон
              </Button>
            </div>
            
            {uploadSuccess && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <p className="text-green-700 dark:text-green-300">
                    Файл успешно загружен! Вредные факторы автоматически присвоены {employees.length} сотрудникам.
                  </p>
                </div>
                <Button onClick={handleNextStep}>
                  Перейти к календарному плану
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

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
          </Card>
        </motion.div>

        {/* Employees List */}
        {employees.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Список сотрудников ({employees.length})
                </h3>
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300 text-xs">№</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300 text-xs">ФИО</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300 text-xs">Дата рожд.</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300 text-xs">Пол</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300 text-xs">Объект/участок</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300 text-xs">Должность</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300 text-xs">Общий стаж</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300 text-xs">Стаж по должности</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300 text-xs">Последний осмотр</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300 text-xs">Вредность</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300 text-xs">Примечание</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-700 dark:text-gray-300 text-xs">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((employee, index) => (
                      <tr
                        key={employee.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        {editingId === employee.id ? (
                          <>
                            <td className="py-2 px-2">{index + 1}</td>
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
                            <td className="py-2 px-2">{index + 1}</td>
                            <td className="py-2 px-2 font-medium">{employee.name}</td>
                            <td className="py-2 px-2">{employee.birthDate ? new Date(employee.birthDate).toLocaleDateString('ru-RU') : '-'}</td>
                            <td className="py-2 px-2">{employee.gender === 'male' ? 'мужской' : employee.gender === 'female' ? 'женский' : '-'}</td>
                            <td className="py-2 px-2">{employee.department}</td>
                            <td className="py-2 px-2">{employee.position}</td>
                            <td className="py-2 px-2">{(employee as any).totalExperienceYears ? `${(employee as any).totalExperienceYears} лет` : '-'}</td>
                            <td className="py-2 px-2">{(employee as any).positionExperienceYears ? `${(employee as any).positionExperienceYears} лет` : '-'}</td>
                            <td className="py-2 px-2">{employee.lastExaminationDate ? new Date(employee.lastExaminationDate).toLocaleDateString('ru-RU') : '-'}</td>
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
                                      alert('Ошибка при генерации QR-кода');
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
                    ))}
                  </tbody>
                </table>
              </div>
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
