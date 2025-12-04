'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Upload, FileSpreadsheet, CheckCircle, Download, Edit2, Trash2, X, Save } from 'lucide-react';
import { workflowStoreAPI, ContingentEmployee } from '@/lib/store/workflow-store-api';

export default function ClinicContingentPage() {
  const [employees, setEmployees] = useState<ContingentEmployee[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ContingentEmployee>>({});

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
      } else {
        alert(`Успешно загружено: ${result.created} сотрудников`);
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

  const handleEdit = (employee: ContingentEmployee) => {
    setEditingId(employee.id);
    setEditData({
      name: employee.name,
      position: employee.position,
      department: employee.department,
      phone: employee.phone,
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
      alert(error.message || 'Ошибка обновления');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await workflowStoreAPI.downloadContingentTemplate();
    } catch (error: any) {
      alert(error.message || 'Ошибка загрузки шаблона');
    }
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
              <h1 className="text-2xl font-bold">Контингент</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Загрузка и управление списком сотрудников, подлежащих медосмотру
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Скачать шаблон
              </Button>
              <label className="cursor-pointer">
                <Button disabled={isUploading}>
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'Загрузка...' : 'Загрузить Excel'}
                </Button>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {uploadSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3 p-4">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="text-green-800 dark:text-green-200">
                  Файл успешно загружен!
                </p>
              </div>
            </Card>
          </motion.div>
        )}

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">ФИО</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Должность</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Отдел</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Телефон</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Действия</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      Контингент не загружен. Загрузите Excel файл со списком сотрудников.
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => (
                    <tr key={employee.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      {editingId === employee.id ? (
                        <>
                          <td className="px-4 py-3">
                            <Input
                              value={editData.name || ''}
                              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                              className="w-full"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              value={editData.position || ''}
                              onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                              className="w-full"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              value={editData.department || ''}
                              onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                              className="w-full"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              value={editData.phone || ''}
                              onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                              className="w-full"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleSaveEdit}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditData({}); }}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{employee.name}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{employee.position}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{employee.department}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{employee.phone || '-'}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleEdit(employee)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleDelete(employee.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}

