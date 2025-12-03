'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { FlaskConical, CheckCircle, Clock, AlertCircle, User, Search, Save } from 'lucide-react';
import { workflowStoreAPI } from '@/lib/store/workflow-store-api';

interface LaboratoryTest {
  id: string;
  route_sheet?: string | number;
  patient_id: string;
  patient_name: string;
  test_type: string;
  test_name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  results?: any;
  notes?: string;
  performed_by?: string;
  performed_at?: string;
  created_at?: string;
}

export default function LaboratoryTestsPage() {
  const [tests, setTests] = useState<LaboratoryTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    status?: string;
    results?: any;
    notes?: string;
    performedBy?: string;
  }>({});

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      setIsLoading(true);
      const data: any = await workflowStoreAPI.getLaboratoryTests();
      console.log('Laboratory tests data:', data);
      
      // Преобразуем данные из API в формат компонента
      const testsArray = Array.isArray(data) ? data : (data.results || []);
      const formattedTests: LaboratoryTest[] = testsArray.map((test: any) => ({
        id: test.id?.toString() || '',
        route_sheet: test.route_sheet,
        patient_id: test.patient_id || '',
        patient_name: test.patient_name || '',
        test_type: test.test_type || '',
        test_name: test.test_name || '',
        status: test.status || 'pending',
        results: test.results || {},
        notes: test.notes || '',
        performed_by: test.performed_by || '',
        performed_at: test.performed_at,
        created_at: test.created_at,
      }));
      setTests(formattedTests);
    } catch (error: any) {
      console.error('Error loading laboratory tests:', error);
      alert(`Ошибка загрузки данных: ${error.message || 'Неизвестная ошибка'}`);
      setTests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (test: LaboratoryTest) => {
    setEditingId(test.id);
    setEditData({
      status: test.status,
      results: test.results || {},
      notes: test.notes || '',
      performedBy: test.performed_by || '',
    });
  };

  const handleSave = async (testId: string) => {
    try {
      const updateData: any = {
        status: editData.status as any,
        results: editData.results || {},
        notes: editData.notes || '',
        performed_by: editData.performedBy || '',
      };
      
      if (editData.status === 'completed') {
        updateData.performed_at = new Date().toISOString();
      }
      
      await workflowStoreAPI.updateLaboratoryTest(testId, updateData);
      await loadTests();
      setEditingId(null);
      setEditData({});
      alert('Результаты сохранены');
    } catch (error: any) {
      console.error('Error saving test:', error);
      alert(error.message || 'Ошибка сохранения');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    };
    return colors[status] || colors.pending;
  };

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="h-4 w-4" />;
    if (status === 'in_progress') return <Clock className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const filteredTests = tests.filter(test => {
    const matchesSearch = !searchValue || 
      test.patient_name.toLowerCase().includes(searchValue.toLowerCase()) ||
      test.test_name.toLowerCase().includes(searchValue.toLowerCase());
    const matchesStatus = filterStatus === 'all' || test.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

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
              <h1 className="text-2xl font-bold">Лабораторные исследования</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Управление лабораторными исследованиями и ввод результатов анализов (п. 13 приказа)
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Поиск и фильтры */}
        <Card className="mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                label="Поиск по пациенту или названию анализа"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Введите ФИО пациента или название анализа..."
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                Все
              </Button>
              <Button
                variant={filterStatus === 'pending' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('pending')}
              >
                Ожидают
              </Button>
              <Button
                variant={filterStatus === 'in_progress' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('in_progress')}
              >
                В процессе
              </Button>
              <Button
                variant={filterStatus === 'completed' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('completed')}
              >
                Завершено
              </Button>
            </div>
          </div>
        </Card>

        {/* Список исследований */}
        <div className="space-y-4">
          {filteredTests.map((test, index) => {
            const isEditing = editingId === test.id;
            
            return (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <FlaskConical className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold">{test.test_name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(test.status)}`}>
                            {getStatusIcon(test.status)}
                            {test.status === 'pending' ? 'Ожидает' : 
                             test.status === 'in_progress' ? 'В процессе' : 'Завершено'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {test.test_type}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <User className="h-4 w-4" />
                          <span>{test.patient_name}</span>
                        </div>
                      </div>
                    </div>
                    {!isEditing && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(test)}
                      >
                        {test.status === 'completed' ? 'Изменить' : 'Ввести результаты'}
                      </Button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Статус
                        </label>
                        <select
                          value={editData.status}
                          onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        >
                          <option value="pending">Ожидает</option>
                          <option value="in_progress">В процессе</option>
                          <option value="completed">Завершено</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Результаты (JSON)
                        </label>
                        <textarea
                          value={JSON.stringify(editData.results || {}, null, 2)}
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              setEditData({ ...editData, results: parsed });
                            } catch {
                              // Игнорируем ошибки парсинга
                            }
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm"
                          rows={6}
                          placeholder='{"параметр": "значение", ...}'
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Примечания
                        </label>
                        <textarea
                          value={editData.notes}
                          onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Выполнил
                        </label>
                        <Input
                          value={editData.performedBy}
                          onChange={(e) => setEditData({ ...editData, performedBy: e.target.value })}
                          placeholder="ФИО лаборанта"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleSave(test.id)}
                          className="flex-1"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Сохранить
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleCancel}
                        >
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : test.status === 'completed' && test.results && Object.keys(test.results).length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h4 className="text-sm font-medium mb-2">Результаты:</h4>
                      <pre className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-sm overflow-x-auto">
                        {JSON.stringify(test.results, null, 2)}
                      </pre>
                      {test.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          <strong>Примечания:</strong> {test.notes}
                        </p>
                      )}
                      {test.performed_by && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Выполнил: {test.performed_by}
                          {test.performed_at && ` • ${new Date(test.performed_at).toLocaleDateString('ru-RU')}`}
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>

        {filteredTests.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <FlaskConical className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Нет лабораторных исследований</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Исследования появятся здесь после генерации маршрутных листов
              </p>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

