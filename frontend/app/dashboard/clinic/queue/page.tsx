'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Clock, User, Stethoscope, CheckCircle, XCircle, AlertCircle, Play, Pause, Phone, Building2 } from 'lucide-react';
import { workflowStoreAPI } from '@/lib/store/workflow-store-api';
import { userStore } from '@/lib/store/user-store';

interface QueueEntry {
  id: string;
  patient_name: string;
  patient_id: string;
  iin: string;
  service_name: string;
  cabinet: string;
  status: 'waiting' | 'called' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';
  priority: 'normal' | 'urgent' | 'vip';
  queue_number: number;
  doctor_name?: string;
  doctor_specialization?: string;
  added_at: string;
  called_at?: string;
  started_at?: string;
  completed_at?: string;
}

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentDoctor, setCurrentDoctor] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    const user = userStore.getCurrentUser();
    setCurrentUser(user);
    
    if (user && user.role === 'clinic' && user.clinicRole === 'doctor') {
      workflowStoreAPI.getDoctors().then(doctors => {
        if (doctors.length > 0) {
          setCurrentDoctor(doctors[0]);
        }
      }).catch(console.error);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    
    if (autoRefresh) {
      const interval = setInterval(loadQueue, 5000); // Обновление каждые 5 секунд
      return () => clearInterval(interval);
    }
  }, [filterStatus, autoRefresh, currentDoctor]);

  const loadQueue = async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      if (currentUser) {
        params.user_id = currentUser.id;
      }
      if (currentDoctor) {
        params.doctor_id = currentDoctor.id;
      }
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      
      const data = await workflowStoreAPI.getPatientQueue(params);
      setQueue(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading queue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallPatient = async (queueId: string) => {
    try {
      await workflowStoreAPI.callPatient(queueId);
      await loadQueue();
    } catch (error: any) {
      alert(error.message || 'Ошибка вызова пациента');
    }
  };

  const handleStartExamination = async (queueId: string) => {
    try {
      await workflowStoreAPI.startExamination(queueId);
      await loadQueue();
    } catch (error: any) {
      alert(error.message || 'Ошибка начала приема');
    }
  };

  const handleCompleteExamination = async (queueId: string) => {
    try {
      await workflowStoreAPI.completeExamination(queueId);
      await loadQueue();
    } catch (error: any) {
      alert(error.message || 'Ошибка завершения приема');
    }
  };

  const handleSkipPatient = async (queueId: string) => {
    if (!confirm('Вы уверены, что хотите пропустить этого пациента?')) {
      return;
    }
    try {
      await workflowStoreAPI.skipPatient(queueId);
      await loadQueue();
    } catch (error: any) {
      alert(error.message || 'Ошибка пропуска пациента');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      waiting: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      called: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      skipped: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[status] || colors.waiting;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      waiting: 'Ожидает',
      called: 'Вызван',
      in_progress: 'На приеме',
      completed: 'Завершен',
      skipped: 'Пропущен',
      cancelled: 'Отменен',
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      normal: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
      urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      vip: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    };
    return colors[priority] || colors.normal;
  };

  const filteredQueue = queue.filter(entry => {
    if (filterStatus === 'all') return true;
    return entry.status === filterStatus;
  });

  const activeQueue = filteredQueue.filter(e => ['waiting', 'called', 'in_progress'].includes(e.status));
  const completedQueue = filteredQueue.filter(e => ['completed', 'skipped'].includes(e.status));

  return (
    <div>
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Электронная очередь</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Управление очередью пациентов в клинике
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={autoRefresh ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                {autoRefresh ? 'Пауза' : 'Автообновление'}
              </Button>
              <Button variant="outline" size="sm" onClick={loadQueue}>
                Обновить
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Фильтры */}
        <Card className="mb-6">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filterStatus === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
            >
              Все
            </Button>
            <Button
              variant={filterStatus === 'waiting' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('waiting')}
            >
              Ожидают ({queue.filter(e => e.status === 'waiting').length})
            </Button>
            <Button
              variant={filterStatus === 'called' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('called')}
            >
              Вызваны ({queue.filter(e => e.status === 'called').length})
            </Button>
            <Button
              variant={filterStatus === 'in_progress' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('in_progress')}
            >
              На приеме ({queue.filter(e => e.status === 'in_progress').length})
            </Button>
          </div>
        </Card>

        {/* Активная очередь */}
        {activeQueue.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Активная очередь</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeQueue.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center font-bold text-lg">
                          {entry.queue_number}
                        </div>
                        <div>
                          <h3 className="font-semibold">{entry.patient_name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{entry.service_name}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                        {getStatusLabel(entry.status)}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      {entry.cabinet && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Building2 className="h-4 w-4" />
                          <span>Кабинет: {entry.cabinet}</span>
                        </div>
                      )}
                      {entry.doctor_name && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Stethoscope className="h-4 w-4" />
                          <span>{entry.doctor_name}</span>
                        </div>
                      )}
                      {entry.priority !== 'normal' && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(entry.priority)}`}>
                          {entry.priority === 'urgent' ? 'Срочно' : 'VIP'}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {entry.status === 'waiting' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleCallPatient(entry.id)}
                            className="flex-1"
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Вызвать
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSkipPatient(entry.id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {entry.status === 'called' && (
                        <Button
                          size="sm"
                          onClick={() => handleStartExamination(entry.id)}
                          className="flex-1"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Начать прием
                        </Button>
                      )}
                      {entry.status === 'in_progress' && (
                        <Button
                          size="sm"
                          onClick={() => handleCompleteExamination(entry.id)}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Завершить
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Завершенные */}
        {completedQueue.length > 0 && filterStatus === 'all' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Завершенные</h2>
            <div className="space-y-2">
              {completedQueue.map((entry) => (
                <Card key={entry.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-400">{entry.queue_number}</span>
                      <div>
                        <p className="font-medium">{entry.patient_name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{entry.service_name}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                      {getStatusLabel(entry.status)}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {filteredQueue.length === 0 && !isLoading && (
          <Card>
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Очередь пуста</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Добавьте пациентов в очередь из маршрутных листов
              </p>
            </div>
          </Card>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
          </div>
        )}
      </main>
    </div>
  );
}

