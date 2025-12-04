'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FileText, Download, Stethoscope } from 'lucide-react';
import Link from 'next/link';
import { workflowStore } from '@/lib/store/workflow-store';

export default function HealthPlanPage() {
  const [healthPlan, setHealthPlan] = useState(workflowStore.getHealthPlanItems());
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const departments = [...new Set(workflowStore.getContingent().map(emp => emp.department))];
    setAvailableDepartments(departments);
    
    if (selectedDepartment) {
      setHealthPlan(workflowStore.getHealthPlanItems(selectedDepartment));
    } else {
      setHealthPlan(workflowStore.getHealthPlanItems());
    }
  }, [selectedDepartment]);

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    // Симуляция генерации PDF плана оздоровления
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsGenerating(false);
    alert('План оздоровления успешно сформирован! PDF готов к скачиванию.');
  };

  return (
    <div>
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">План оздоровления</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Санитарно-оздоровительные мероприятия. Автоматическая таблица, которая выдергивает всех «нездоровых» и подставляет рекомендации, которые врачи писали на приеме.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {availableDepartments.length > 0 && (
          <Card className="mb-8">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Фильтр по отделу (опционально)
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
            >
              <option value="">Все отделы</option>
              {availableDepartments.map(dept => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </Card>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
              <h2 className="text-xl font-semibold">Рекомендации по оздоровлению</h2>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Список сотрудников с выявленными патологиями и рекомендациями врачей:
              </p>
              {healthPlan.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">ФИО</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Должность</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Рекомендация</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthPlan.map((item) => (
                        <tr
                          key={item.patientId}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <td className="py-3 px-4">{item.employeeName}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                              {item.position}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Stethoscope className="h-4 w-4 text-gray-400" />
                              <span>{item.recommendation}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Нет сотрудников с выявленными патологиями
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <Button
                onClick={handleGeneratePDF}
                isLoading={isGenerating}
                disabled={healthPlan.length === 0}
                className="w-full"
                size="lg"
              >
                <Download className="h-5 w-5 mr-2" />
                Сформировать План оздоровления (PDF)
              </Button>
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
