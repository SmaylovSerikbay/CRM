'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FileText, Download, CheckCircle, Users, AlertCircle, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';
import { workflowStoreAPI } from '@/lib/store/workflow-store-api';

export default function FinalActPage() {
  const [stats, setStats] = useState({
    totalExamined: 0,
    healthy: 0,
    temporaryContraindications: 0,
    permanentContraindications: 0,
    occupationalDiseases: 0,
  });
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const statsData: any = await workflowStoreAPI.getFinalActStats(selectedDepartment || undefined);
        setStats({
          totalExamined: statsData.totalExamined || 0,
          healthy: statsData.healthy || 0,
          temporaryContraindications: statsData.temporaryContraindications || 0,
          permanentContraindications: statsData.permanentContraindications || 0,
          occupationalDiseases: statsData.occupationalDiseases || 0,
        });
        // TODO: Проверка готовности отделов через API
        setIsReady(true);
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    };
    loadData();
  }, [selectedDepartment]);

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      // Экспорт в PDF
      await workflowStoreAPI.exportFinalActPDF(selectedDepartment || undefined);
      
      // Отправка в ТСБ/СЭБН и работодателю (если нужно)
      try {
        await workflowStoreAPI.sendFinalActToTSB({
          department: selectedDepartment,
          stats,
          examinationPeriod: `${new Date().getFullYear()}`,
        });
      } catch (sendError) {
        console.warn('Ошибка отправки акта (не критично):', sendError);
      }
      
      setIsGenerating(false);
      alert('Заключительный акт успешно сформирован и скачан!');
    } catch (error: any) {
      setIsGenerating(false);
      alert(error.message || 'Ошибка генерации акта');
    }
  };

  const handleGenerateExcel = async () => {
    setIsGenerating(true);
    try {
      await workflowStoreAPI.exportFinalActExcel(selectedDepartment || undefined);
      setIsGenerating(false);
      alert('Заключительный акт успешно экспортирован в Excel!');
    } catch (error: any) {
      setIsGenerating(false);
      alert(error.message || 'Ошибка экспорта в Excel');
    }
  };

  return (
    <div>
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Заключительный акт</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Формирование итогового документа со статистикой осмотров по форме Приказа 131. Эти документы делаются после того, как осмотр прошла ВСЯ компания (или весь цех). Подписывают: Главврач клиники, Представитель Работодателя и Представитель СЭС.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!isReady && (
          <Card className="mb-8">
            <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Не все сотрудники прошли экспертизу
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Заключительный акт можно сформировать только после того, как все сотрудники прошли осмотр и получили вердикт Профпатолога
                </p>
              </div>
            </div>
          </Card>
        )}

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
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-xl font-semibold">Статистика осмотров</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Осмотрено
                  </span>
                </div>
                <p className="text-3xl font-bold">{stats.totalExamined} чел.</p>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Здоровы
                  </span>
                </div>
                <p className="text-3xl font-bold">{stats.healthy}</p>
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Временные противопоказания
                  </span>
                </div>
                <p className="text-3xl font-bold">{stats.temporaryContraindications}</p>
              </div>

              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Постоянные противопоказания
                  </span>
                </div>
                <p className="text-3xl font-bold">{stats.permanentContraindications}</p>
              </div>

              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Выявлено профзаболеваний
                  </span>
                </div>
                <p className="text-3xl font-bold">{stats.occupationalDiseases}</p>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Подписание документа:</h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <p>• Главврач клиники: <span className="font-medium text-gray-900 dark:text-gray-100">Ожидает подписи</span></p>
                  <p>• Представитель Работодателя: <span className="font-medium text-gray-900 dark:text-gray-100">Ожидает подписи</span></p>
                  <p>• Представитель СЭС: <span className="font-medium text-gray-900 dark:text-gray-100">Ожидает подписи</span></p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Button
                  onClick={handleGeneratePDF}
                  isLoading={isGenerating}
                  disabled={!isReady}
                  className="w-full"
                  size="lg"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Скачать PDF
                </Button>
                <Button
                  onClick={handleGenerateExcel}
                  isLoading={isGenerating}
                  disabled={!isReady}
                  className="w-full"
                  size="lg"
                  variant="outline"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Скачать Excel
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
