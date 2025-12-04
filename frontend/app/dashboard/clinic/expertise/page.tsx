'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { AlertTriangle, CheckCircle, XCircle, Clock, User, Send, FlaskConical, Activity, AlertCircle } from 'lucide-react';
import { workflowStoreAPI, Expertise } from '@/lib/store/workflow-store-api';
import { userStore } from '@/lib/store/user-store';
import { useToast } from '@/components/ui/Toast';

export default function ExpertisePage() {
  const { showToast } = useToast();
  const [expertises, setExpertises] = useState<Expertise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingVerdict, setEditingVerdict] = useState<string | null>(null);
  const [verdictData, setVerdictData] = useState({
    temporaryUnfitUntil: '',
    reason: '',
  });
  const [readinessChecks, setReadinessChecks] = useState<Record<string, { is_ready: boolean; errors: string[] }>>({});
  const [testResults, setTestResults] = useState<Record<string, { lab: any[]; func: any[] }>>({});

  useEffect(() => {
    const loadExpertises = async () => {
      try {
        const data = await workflowStoreAPI.getExpertises();
        setExpertises(data);
        
        // Загружаем проверки готовности и результаты исследований для каждого пациента
        for (const expertise of data) {
          // Проверка готовности
          try {
            const readiness = await workflowStoreAPI.checkExpertiseReadiness(expertise.patientId);
            setReadinessChecks(prev => ({ ...prev, [expertise.patientId]: readiness }));
          } catch (error) {
            console.error('Error checking readiness:', error);
          }
          
          // Результаты исследований
          try {
            const [labTests, funcTests] = await Promise.all([
              workflowStoreAPI.getLaboratoryTests(expertise.patientId),
              workflowStoreAPI.getFunctionalTests(expertise.patientId),
            ]);
            setTestResults(prev => ({
              ...prev,
              [expertise.patientId]: { lab: labTests, func: funcTests },
            }));
          } catch (error) {
            console.error('Error loading test results:', error);
          }
        }
      } catch (error) {
        console.error('Error loading expertises:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadExpertises();
  }, []);

  const handleVerdict = async (
    expertiseId: string,
    verdict: 'fit' | 'temporary_unfit' | 'permanent_unfit',
    temporaryUnfitUntil?: string,
    reason?: string
  ) => {
    const expertise = expertises.find(e => e.id === expertiseId);
    if (!expertise) return;

    // Проверяем готовность перед вынесением вердикта
    const readiness = readinessChecks[expertise.patientId];
    if (readiness && !readiness.is_ready) {
      showToast(`Нельзя вынести вердикт. Ошибки: ${readiness.errors.join(', ')}`, 'error', 8000);
      return;
    }

    const currentUser = userStore.getCurrentUser();
    const profpathologistName = currentUser?.registrationData?.contactPerson || 'Профпатолог';

    try {
      await workflowStoreAPI.updateExpertiseVerdict(
        expertiseId,
        verdict,
        profpathologistName,
        temporaryUnfitUntil,
        reason
      );
      
      // Reload expertises to get updated health group
      const updated = await workflowStoreAPI.getExpertises();
      const updatedExpertise = updated.find(e => e.id === expertiseId);
      
      // Автоматически создаем направление, если требуется
      if (updatedExpertise && updatedExpertise.requiresReferral && updatedExpertise.referralType && !updatedExpertise.referralSent) {
        try {
          await workflowStoreAPI.createReferral({
            expertiseId: expertiseId,
            patientId: updatedExpertise.patientId,
            patientName: updatedExpertise.patientName,
            iin: updatedExpertise.iin,
            referralType: updatedExpertise.referralType,
            reason: updatedExpertise.reason || 'Требуется направление согласно группе здоровья',
          });
        } catch (refError: any) {
          console.error('Error creating referral:', refError);
          // Не блокируем сохранение вердикта, если направление не создалось
        }
      }
      
      setExpertises(updated);
      setEditingVerdict(null);
      setVerdictData({ temporaryUnfitUntil: '', reason: '' });
      showToast('Вердикт успешно сохранен', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка сохранения вердикта', 'error');
    }
  };

  const hasPathology = (expertise: Expertise) => {
    return expertise.doctorConclusions.some(dc => dc.conclusion === 'unhealthy');
  };

  const getRecommendedVerdict = (expertise: Expertise) => {
    const hasUnhealthy = hasPathology(expertise);
    if (!hasUnhealthy) return 'fit';
    
    const criticalPosition = expertise.position === 'Пилот';
    const hasCriticalPathology = expertise.doctorConclusions.some(
      dc => dc.conclusion === 'unhealthy' && dc.notes?.toLowerCase().includes('глухота')
    );
    
    if (criticalPosition && hasCriticalPathology) {
      return 'permanent_unfit';
    }
    
    return 'temporary_unfit';
  };

  const getHealthGroupLabel = (group?: string) => {
    const labels: Record<string, string> = {
      '1': 'Группа 1 - Здоровый',
      '2': 'Группа 2 - Практически здоровый',
      '3': 'Группа 3 - Имеет признаки воздействия ВПФ',
      '4': 'Группа 4 - Требует динамического наблюдения',
      '5': 'Группа 5 - Требует лечения',
      '6': 'Группа 6 - Требует реабилитации/профпатологии',
    };
    return group ? labels[group] : 'Не присвоена';
  };

  const getHealthGroupColor = (group?: string) => {
    const colors: Record<string, string> = {
      '1': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      '2': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      '3': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      '4': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      '5': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      '6': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    };
    return group ? colors[group] : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
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
              <h1 className="text-2xl font-bold">Экспертиза (Обобщение результатов)</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Профпатолог выносит вердикт на основе заключений всех врачей. Система автоматически присваивает группу здоровья и подсвечивает красным, если найдена патология.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {expertises.map((expertise, index) => {
            const hasPath = hasPathology(expertise);
            const recommendedVerdict = getRecommendedVerdict(expertise);
            const isEditing = editingVerdict === expertise.id;

            return (
              <motion.div
                key={expertise.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={hasPath ? 'border-2 border-red-500 dark:border-red-500' : ''}>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{expertise.patientName}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {expertise.position} • {expertise.department} • ИИН: {expertise.iin}
                          </p>
                        </div>
                      </div>
                      {hasPath && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                          <span className="text-sm font-medium text-red-700 dark:text-red-300">
                            Обнаружена патология!
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Заключения врачей:
                    </h4>
                    <div className="space-y-2">
                      {expertise.doctorConclusions.map((dc, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg ${
                            dc.conclusion === 'unhealthy'
                              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                              : 'bg-gray-50 dark:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{dc.specialization} - {dc.doctorName}</p>
                              {dc.notes && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  {dc.notes}
                                </p>
                              )}
                            </div>
                            {dc.conclusion === 'healthy' ? (
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {expertise.finalVerdict && expertise.healthGroup && (
                    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Группа здоровья (автоматически присвоена):</p>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthGroupColor(expertise.healthGroup)}`}>
                            {getHealthGroupLabel(expertise.healthGroup)}
                          </span>
                        </div>
                        {expertise.requiresReferral && (
                          <div className="flex items-center gap-2">
                            {expertise.referralSent ? (
                              <span className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                Направление создано
                              </span>
                            ) : (
                              <span className="px-3 py-1 text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full">
                                Требуется направление ({expertise.referralType === 'rehabilitation' ? 'реабилитация' : expertise.referralType === 'profpathology' ? 'профпатология' : 'специалист'})
                              </span>
                            )}
                            <a
                              href="/dashboard/clinic/referrals"
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Управление →
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300">
                      Вердикт Профпатолога:
                    </h4>
                      {!expertise.finalVerdict && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              const readiness = await workflowStoreAPI.checkExpertiseReadiness(expertise.patientId);
                              setReadinessChecks(prev => ({ ...prev, [expertise.patientId]: readiness }));
                              if (!readiness.is_ready) {
                                showToast(`Не все исследования завершены: ${readiness.errors.join(', ')}`, 'warning', 8000);
                              } else {
                                showToast('Все исследования завершены. Можно выносить вердикт.', 'success');
                              }
                            } catch (error: any) {
                              showToast(error.message || 'Ошибка проверки готовности', 'error');
                            }
                          }}
                        >
                          Проверить готовность
                        </Button>
                      )}
                    </div>
                    {expertise.finalVerdict ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          {expertise.finalVerdict === 'fit' && (
                            <span className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg flex items-center gap-2">
                              <CheckCircle className="h-5 w-5" />
                              Годен
                            </span>
                          )}
                          {expertise.finalVerdict === 'temporary_unfit' && (
                            <span className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg flex items-center gap-2">
                              <Clock className="h-5 w-5" />
                              Временная непригодность
                              {expertise.temporaryUnfitUntil && (
                                <span className="text-xs">до {new Date(expertise.temporaryUnfitUntil).toLocaleDateString('ru-RU')}</span>
                              )}
                            </span>
                          )}
                          {expertise.finalVerdict === 'permanent_unfit' && (
                            <span className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2">
                              <XCircle className="h-5 w-5" />
                              Постоянная непригодность
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingVerdict(expertise.id)}
                          >
                            Изменить
                          </Button>
                        </div>
                        {expertise.reason && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <strong>Причина:</strong> {expertise.reason}
                          </p>
                        )}
                        {expertise.profpathologistName && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Профпатолог: {expertise.profpathologistName} • {expertise.verdictDate ? new Date(expertise.verdictDate).toLocaleDateString('ru-RU') : ''}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="flex gap-3">
                              <Button
                                onClick={() => handleVerdict(expertise.id, 'fit')}
                                variant={recommendedVerdict === 'fit' ? 'primary' : 'outline'}
                                className="flex-1"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Годен
                              </Button>
                              <Button
                                onClick={() => {
                                  if (recommendedVerdict === 'temporary_unfit') {
                                    setEditingVerdict(expertise.id);
                                  } else {
                                    handleVerdict(expertise.id, 'temporary_unfit');
                                  }
                                }}
                                variant={recommendedVerdict === 'temporary_unfit' ? 'primary' : 'outline'}
                                className="flex-1"
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                Временная непригодность
                              </Button>
                              <Button
                                onClick={() => handleVerdict(expertise.id, 'permanent_unfit')}
                                variant={recommendedVerdict === 'permanent_unfit' ? 'primary' : 'outline'}
                                className="flex-1"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Постоянная непригодность
                              </Button>
                            </div>
                            {recommendedVerdict === 'temporary_unfit' && (
                              <div className="space-y-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                <Input
                                  type="date"
                                  label="Непригоден до"
                                  value={verdictData.temporaryUnfitUntil}
                                  onChange={(e) => setVerdictData({ ...verdictData, temporaryUnfitUntil: e.target.value })}
                                />
                                <Input
                                  label="Причина"
                                  value={verdictData.reason}
                                  onChange={(e) => setVerdictData({ ...verdictData, reason: e.target.value })}
                                  placeholder="Укажите причину временной непригодности"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => handleVerdict(
                                      expertise.id,
                                      'temporary_unfit',
                                      verdictData.temporaryUnfitUntil,
                                      verdictData.reason
                                    )}
                                    className="flex-1"
                                  >
                                    Сохранить
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setEditingVerdict(null);
                                      setVerdictData({ temporaryUnfitUntil: '', reason: '' });
                                    }}
                                  >
                                    Отмена
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {readinessChecks[expertise.patientId] && !readinessChecks[expertise.patientId].is_ready && (
                              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <p className="text-sm text-red-700 dark:text-red-300">
                                  ⚠️ Нельзя вынести вердикт: не все исследования завершены
                                </p>
                              </div>
                            )}
                          <div className="flex gap-3">
                            <Button
                              onClick={() => handleVerdict(expertise.id, 'fit')}
                              variant={recommendedVerdict === 'fit' ? 'primary' : 'outline'}
                              className="flex-1"
                                disabled={readinessChecks[expertise.patientId] && !readinessChecks[expertise.patientId].is_ready}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Годен
                            </Button>
                            <Button
                              onClick={() => {
                                setEditingVerdict(expertise.id);
                              }}
                              variant={recommendedVerdict === 'temporary_unfit' ? 'primary' : 'outline'}
                              className="flex-1"
                                disabled={readinessChecks[expertise.patientId] && !readinessChecks[expertise.patientId].is_ready}
                            >
                              <Clock className="h-4 w-4 mr-2" />
                              Временная непригодность
                            </Button>
                            <Button
                              onClick={() => {
                                const reason = prompt('Укажите причину постоянной непригодности:');
                                if (reason) {
                                  handleVerdict(expertise.id, 'permanent_unfit', undefined, reason);
                                }
                              }}
                              variant={recommendedVerdict === 'permanent_unfit' ? 'primary' : 'outline'}
                              className="flex-1"
                                disabled={readinessChecks[expertise.patientId] && !readinessChecks[expertise.patientId].is_ready}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Постоянная непригодность
                            </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {expertises.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Нет пациентов для экспертизы</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Пациенты появятся здесь после прохождения всех врачей и сдачи всех анализов
              </p>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
