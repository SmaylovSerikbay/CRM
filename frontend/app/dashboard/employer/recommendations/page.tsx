'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { CheckCircle, Clock, XCircle, AlertCircle, User } from 'lucide-react';
import { workflowStoreAPI } from '@/lib/store/workflow-store-api';
import { useToast } from '@/components/ui/Toast';

export default function RecommendationsPage() {
  const { showToast } = useToast();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        const data = await workflowStoreAPI.getRecommendations();
        setRecommendations(data);
      } catch (error) {
        console.error('Error loading recommendations:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadRecommendations();
  }, []);

  const handleUpdateStatus = async (id: string, status: 'pending' | 'in_progress' | 'completed' | 'cancelled', completionDate?: string) => {
    try {
      await workflowStoreAPI.updateRecommendation(id, status, completionDate);
      const updated = await workflowStoreAPI.getRecommendations();
      setRecommendations(updated);
    } catch (error: any) {
      showToast(error.message || 'Ошибка обновления статуса', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return colors[status] || colors.pending;
  };

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="h-4 w-4" />;
    if (status === 'in_progress') return <Clock className="h-4 w-4" />;
    if (status === 'cancelled') return <XCircle className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      transfer: 'Перевод на другую работу',
      treatment: 'Лечение',
      observation: 'Динамическое наблюдение',
      rehabilitation: 'Реабилитация',
    };
    return labels[type] || type;
  };

  const filteredRecommendations = filterStatus === 'all'
    ? recommendations
    : recommendations.filter((r: any) => r.status === filterStatus);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Загрузка...</div>;
  }

  return (
    <div>
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Контроль исполнения рекомендаций</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Мониторинг выполнения рекомендаций врачей: перевод, лечение, динамическое наблюдение, реабилитация (п. 20)
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Card className="mb-8">
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
              Ожидают исполнения
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
              Выполнено
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          {filteredRecommendations.map((rec, index) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{rec.patient_name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {getTypeLabel(rec.recommendation_type)}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getStatusColor(rec.status)}`}>
                    {getStatusIcon(rec.status)}
                    {rec.status === 'pending' ? 'Ожидает исполнения' :
                     rec.status === 'in_progress' ? 'В процессе' :
                     rec.status === 'completed' ? 'Выполнено' : 'Отменено'}
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-gray-700 dark:text-gray-300">{rec.recommendation}</p>
                  {rec.completion_date && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Дата выполнения: {new Date(rec.completion_date).toLocaleDateString('ru-RU')}
                    </p>
                  )}
                  {rec.notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Примечания: {rec.notes}
                    </p>
                  )}
                </div>

                {rec.status !== 'completed' && rec.status !== 'cancelled' && (
                  <div className="flex gap-2">
                    {rec.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(rec.id.toString(), 'in_progress')}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Начать выполнение
                        </Button>
                      </>
                    )}
                    {rec.status === 'in_progress' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            const date = prompt('Введите дату выполнения (YYYY-MM-DD):');
                            if (date) {
                              handleUpdateStatus(rec.id.toString(), 'completed', date);
                            }
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Отметить выполненным
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus(rec.id.toString(), 'cancelled')}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Отменить
                    </Button>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredRecommendations.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Нет рекомендаций</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Рекомендации появятся здесь после завершения экспертизы и вынесения вердикта профпатологом
              </p>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

