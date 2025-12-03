'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { 
  Search, Calendar, User, Stethoscope, FileText, CheckCircle, 
  XCircle, AlertCircle, Clock, MapPin, FlaskConical, Activity
} from 'lucide-react';
import { workflowStoreAPI } from '@/lib/store/workflow-store-api';

export default function PatientHistoryPage() {
  const [searchValue, setSearchValue] = useState('');
  const [patientHistory, setPatientHistory] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      setError('Введите ИИН или ID пациента');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Пробуем найти по ИИН или ID
      const history = await workflowStoreAPI.getPatientHistory(
        searchValue.length > 10 ? undefined : searchValue, // Если короткий - ID, если длинный - ИИН
        searchValue.length > 10 ? searchValue : undefined
      );
      
      setPatientHistory(history);
    } catch (error: any) {
      console.error('Error loading patient history:', error);
      setError(error?.response?.data?.error || error?.message || 'Ошибка загрузки истории');
      setPatientHistory(null);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Без даты';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'fit':
        return 'text-green-600 dark:text-green-400';
      case 'temporary_unfit':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'permanent_unfit':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getVerdictLabel = (verdict: string) => {
    switch (verdict) {
      case 'fit':
        return 'Годен';
      case 'temporary_unfit':
        return 'Временно не годен';
      case 'permanent_unfit':
        return 'Постоянно не годен';
      default:
        return verdict || 'Не определен';
    }
  };

  const getConclusionIcon = (conclusion: string) => {
    switch (conclusion) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">История осмотров пациента</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Просмотр истории медицинских осмотров по ИИН или ID пациента
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Поиск */}
        <Card className="mb-8">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Введите ИИН или ID пациента"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </div>
            <Button
              onClick={handleSearch}
              isLoading={isLoading}
              disabled={!searchValue.trim()}
            >
              <Search className="h-5 w-5 mr-2" />
              Найти
            </Button>
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </Card>

        {/* История осмотров */}
        {patientHistory && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card>
              <div className="flex items-center gap-3 mb-6">
                <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <div>
                  <h2 className="text-xl font-semibold">История осмотров</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Всего визитов: {patientHistory.total_visits || 0}
                  </p>
                </div>
              </div>

              {patientHistory.history && patientHistory.history.length > 0 ? (
                <div className="space-y-6">
                  {patientHistory.history.map((visit: any, index: number) => (
                    <div
                      key={index}
                      className="border-l-4 border-blue-500 pl-6 pb-6 last:pb-0"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-lg font-semibold">
                          {formatDate(visit.date)}
                        </h3>
                      </div>

                      {/* Маршрутные листы */}
                      {visit.route_sheets && visit.route_sheets.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Маршрутные листы
                          </h4>
                          <div className="space-y-3">
                            {visit.route_sheets.map((rs: any) => (
                              <div
                                key={rs.id}
                                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">
                                    Прогресс: {rs.completed_services} / {rs.total_services} услуг
                                  </span>
                                  <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-blue-500 transition-all"
                                      style={{
                                        width: `${(rs.completed_services / rs.total_services) * 100}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                                {rs.services && rs.services.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {rs.services.map((service: any, idx: number) => (
                                      <div
                                        key={idx}
                                        className={`text-sm flex items-center gap-2 ${
                                          service.status === 'completed'
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-gray-600 dark:text-gray-400'
                                        }`}
                                      >
                                        {service.status === 'completed' ? (
                                          <CheckCircle className="h-4 w-4" />
                                        ) : (
                                          <Clock className="h-4 w-4" />
                                        )}
                                        {service.name}
                                        {service.cabinet && (
                                          <span className="text-xs">(Кабинет: {service.cabinet})</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Врачебные осмотры */}
                      {visit.examinations && visit.examinations.length > 0 && (
                        <div className="mb-4">
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <Stethoscope className="h-4 w-4" />
                            Врачебные осмотры
                          </h4>
                          <div className="space-y-3">
                            {visit.examinations.map((exam: any) => (
                              <div
                                key={exam.id}
                                className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {getConclusionIcon(exam.conclusion)}
                                    <div>
                                      <p className="font-medium">{exam.doctor_name}</p>
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {exam.specialization}
                                      </p>
                                    </div>
                                  </div>
                                  {exam.examination_date && (
                                    <span className="text-xs text-gray-500">
                                      {new Date(exam.examination_date).toLocaleTimeString('ru-RU', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  )}
                                </div>
                                {exam.notes && (
                                  <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">
                                    <span className="font-medium">Диагноз:</span> {exam.notes}
                                  </p>
                                )}
                                {exam.recommendations && (
                                  <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">
                                    <span className="font-medium">Рекомендации:</span>{' '}
                                    {exam.recommendations}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Экспертизы */}
                      {visit.expertises && visit.expertises.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Экспертизы
                          </h4>
                          <div className="space-y-3">
                            {visit.expertises.map((exp: any) => (
                              <div
                                key={exp.id}
                                className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className={`font-semibold ${getVerdictColor(exp.final_verdict)}`}>
                                      {getVerdictLabel(exp.final_verdict)}
                                    </p>
                                    {exp.health_group && (
                                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        Группа здоровья: {exp.health_group}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>История осмотров не найдена</p>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {!patientHistory && !isLoading && (
          <Card>
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Начните поиск</h3>
              <p>Введите ИИН или ID пациента для просмотра истории осмотров</p>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

