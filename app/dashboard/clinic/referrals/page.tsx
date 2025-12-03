'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Send, CheckCircle, Clock, AlertCircle, User, Search, XCircle, FileText } from 'lucide-react';
import { workflowStoreAPI } from '@/lib/store/workflow-store-api';
import { userStore } from '@/lib/store/user-store';

interface Referral {
  id: string;
  patient_id: string;
  patient_name: string;
  iin: string;
  referral_type: 'rehabilitation' | 'profpathology' | 'specialist';
  target_organization?: string;
  reason: string;
  status: 'created' | 'sent' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  sent_at?: string;
  accepted_at?: string;
  completed_at?: string;
  notes?: string;
}

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReferrals();
  }, []);

  const loadReferrals = async () => {
    try {
      setIsLoading(true);
      const data = await workflowStoreAPI.getReferrals();
      setReferrals(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error loading referrals:', error);
      setError(error?.message || 'Ошибка загрузки направлений');
      setReferrals([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await workflowStoreAPI.updateReferralStatus(id, newStatus as any);
      await loadReferrals();
      alert('Статус обновлен');
    } catch (error: any) {
      alert(error.message || 'Ошибка обновления статуса');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      created: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      accepted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[status] || colors.created;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      created: 'Создано',
      sent: 'Отправлено',
      accepted: 'Принято',
      in_progress: 'В процессе',
      completed: 'Завершено',
      cancelled: 'Отменено',
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      rehabilitation: 'Реабилитация',
      profpathology: 'Профпатология',
      specialist: 'Узкий специалист',
    };
    return labels[type] || type;
  };

  const filteredReferrals = referrals.filter(ref => {
    const matchesSearch = !searchValue || 
      ref.patient_name.toLowerCase().includes(searchValue.toLowerCase()) ||
      ref.iin.includes(searchValue);
    const matchesStatus = filterStatus === 'all' || ref.status === filterStatus;
    const matchesType = filterType === 'all' || ref.referral_type === filterType;
    return matchesSearch && matchesStatus && matchesType;
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
              <h1 className="text-2xl font-bold">Направления</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Управление направлениями на реабилитацию, профпатологию и к узким специалистам (п. 22, 24 приказа)
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Поиск и фильтры */}
        <Card className="mb-6">
          <div className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  label="Поиск по пациенту или ИИН"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Введите ФИО пациента или ИИН..."
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="flex gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 py-2">Статус:</span>
                <Button
                  variant={filterStatus === 'all' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('all')}
                >
                  Все
                </Button>
                <Button
                  variant={filterStatus === 'created' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('created')}
                >
                  Создано
                </Button>
                <Button
                  variant={filterStatus === 'sent' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('sent')}
                >
                  Отправлено
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
              <div className="flex gap-2 ml-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 py-2">Тип:</span>
                <Button
                  variant={filterType === 'all' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('all')}
                >
                  Все
                </Button>
                <Button
                  variant={filterType === 'rehabilitation' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('rehabilitation')}
                >
                  Реабилитация
                </Button>
                <Button
                  variant={filterType === 'profpathology' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('profpathology')}
                >
                  Профпатология
                </Button>
                <Button
                  variant={filterType === 'specialist' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('specialist')}
                >
                  Специалист
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Список направлений */}
        <div className="space-y-4">
          {filteredReferrals.map((referral, index) => (
            <motion.div
              key={referral.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold">{referral.patient_name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(referral.status)}`}>
                          {getStatusLabel(referral.status)}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                          {getTypeLabel(referral.referral_type)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        ИИН: {referral.iin}
                      </p>
                      <div className="mt-2">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Причина:</strong> {referral.reason}
                        </p>
                        {referral.target_organization && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <strong>Целевая организация:</strong> {referral.target_organization}
                          </p>
                        )}
                      </div>
                      {referral.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          <strong>Примечания:</strong> {referral.notes}
                        </p>
                      )}
                      <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {referral.sent_at && (
                          <span>Отправлено: {new Date(referral.sent_at).toLocaleDateString('ru-RU')}</span>
                        )}
                        {referral.accepted_at && (
                          <span>Принято: {new Date(referral.accepted_at).toLocaleDateString('ru-RU')}</span>
                        )}
                        {referral.completed_at && (
                          <span>Завершено: {new Date(referral.completed_at).toLocaleDateString('ru-RU')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Действия */}
                {referral.status !== 'completed' && referral.status !== 'cancelled' && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex gap-2">
                    {referral.status === 'created' && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(referral.id, 'sent')}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Отправить
                      </Button>
                    )}
                    {referral.status === 'sent' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(referral.id, 'accepted')}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Отметить принятым
                      </Button>
                    )}
                    {referral.status === 'accepted' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(referral.id, 'in_progress')}
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        Начать выполнение
                      </Button>
                    )}
                    {referral.status === 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus(referral.id, 'completed')}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Завершить
                      </Button>
                    )}
                    {(referral.status === 'created' || referral.status === 'accepted' || referral.status === 'in_progress') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Вы уверены, что хотите отменить направление?')) {
                            handleUpdateStatus(referral.id, 'cancelled');
                          }
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Отменить
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredReferrals.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <Send className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Нет направлений</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Направления создаются автоматически при вынесении вердикта профпатологом для групп здоровья 4, 5, 6
              </p>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

