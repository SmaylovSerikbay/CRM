'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Plus, Users, Upload, X, FileSpreadsheet } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  iin: string;
  phone: string;
  harmfulFactors: string[];
}

export default function EmployeesPage() {
  const [showForm, setShowForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: '1',
      name: 'Иванов Иван Иванович',
      position: 'Сварщик',
      department: 'Цех №1',
      iin: '123456789012',
      phone: '+7 777 123 4567',
      harmfulFactors: ['Шум', 'Вибрация', 'Сварочные аэрозоли'],
    },
  ]);
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    department: '',
    iin: '',
    phone: '',
    harmfulFactors: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEmployee: Employee = {
      id: Date.now().toString(),
      ...formData,
      harmfulFactors: formData.harmfulFactors.split(',').map(f => f.trim()).filter(f => f),
    };
    setEmployees([...employees, newEmployee]);
    setFormData({ name: '', position: '', department: '', iin: '', phone: '', harmfulFactors: '' });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    setEmployees(employees.filter(e => e.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Симуляция загрузки Excel файла
      // В реальности здесь будет парсинг Excel и добавление сотрудников
      alert('Файл загружен! В реальном приложении здесь будет парсинг Excel и добавление сотрудников.');
      setShowUpload(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Сотрудники</h1>
              <p className="text-gray-600 dark:text-gray-400">Управление сотрудниками организации</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowUpload(!showUpload)}>
                <Upload className="h-4 w-4 mr-2" />
                Загрузить Excel
              </Button>
              <Button onClick={() => setShowForm(!showForm)}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить сотрудника
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Upload Form */}
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-6 w-6 text-green-600 dark:text-green-400" />
                  <h2 className="text-xl font-semibold">Загрузка списка контингента</h2>
                </div>
                <button
                  onClick={() => setShowUpload(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                  Загрузите Excel-файл со списком сотрудников. Файл должен содержать колонки:
                  ФИО, Должность, Цех, ИИН, Телефон, Вредные факторы.
                </p>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <label className="cursor-pointer">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Выберите файл или перетащите сюда
                    </span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Поддерживаются файлы .xlsx, .xls
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Add Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Добавить сотрудника</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="ФИО"
                    placeholder="Иванов Иван Иванович"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  <Input
                    label="Должность"
                    placeholder="Сварщик, Водитель, Бухгалтер..."
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    required
                  />
                  <Input
                    label="Цех/Отдел"
                    placeholder="Цех №1, Офис..."
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                  />
                  <Input
                    label="ИИН"
                    placeholder="123456789012"
                    value={formData.iin}
                    onChange={(e) => setFormData({ ...formData, iin: e.target.value })}
                    required
                  />
                  <Input
                    label="Телефон"
                    placeholder="+7 777 123 4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                  <Input
                    label="Вредные факторы (через запятую)"
                    placeholder="Шум, Вибрация, Сварочные аэрозоли"
                    value={formData.harmfulFactors}
                    onChange={(e) => setFormData({ ...formData, harmfulFactors: e.target.value })}
                    className="md:col-span-2"
                  />
                </div>
                <div className="flex gap-4">
                  <Button type="submit" className="flex-1">
                    Добавить сотрудника
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Отмена
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}

        {/* Employees List */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((employee, index) => (
            <motion.div
              key={employee.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card hover>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{employee.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {employee.position}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(employee.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Цех:</span> {employee.department}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">ИИН:</span> {employee.iin}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Телефон:</span> {employee.phone}
                  </p>
                  {employee.harmfulFactors.length > 0 && (
                    <div>
                      <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Вредные факторы:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {employee.harmfulFactors.map((factor, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded"
                          >
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {employees.length === 0 && !showForm && (
          <Card>
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Нет сотрудников</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Добавьте сотрудников вручную или загрузите Excel-файл
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setShowUpload(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Загрузить Excel
                </Button>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить сотрудника
                </Button>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

