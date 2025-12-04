'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Stethoscope, CheckCircle, XCircle, User, AlertCircle, Send } from 'lucide-react';
import { workflowStoreAPI } from '@/lib/store/workflow-store-api';
import { userStore } from '@/lib/store/user-store';
import { Input } from '@/components/ui/Input';

export default function MedicalCommissionPage() {
  const [routeSheets, setRouteSheets] = useState<any[]>([]);
  const [examinations, setExaminations] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showEmergencyNotification, setShowEmergencyNotification] = useState<string | null>(null);
  const [emergencyData, setEmergencyData] = useState({
    diseaseType: '',
    diagnosis: '',
  });
  const [examinationData, setExaminationData] = useState<Record<string, {
    conclusion: 'healthy' | 'unhealthy' | null;
    diagnosis: string;
    recommendations: string;
    doctorSignature: string;
  }>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentDoctor, setCurrentDoctor] = useState<any>(null);

  useEffect(() => {
    const user = userStore.getCurrentUser();
    setCurrentUser(user);
    
    // Загружаем информацию о враче, если пользователь - врач
    if (user && user.role === 'clinic' && user.clinicRole === 'doctor') {
      workflowStoreAPI.getDoctors().then(doctors => {
        if (doctors.length > 0) {
          setCurrentDoctor(doctors[0]);
        }
      }).catch(console.error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const sheets = await workflowStoreAPI.getRouteSheets();
        setRouteSheets(sheets);
        
        // Load examinations for each patient
        const exams: Record<string, any[]> = {};
        for (const sheet of sheets) {
          const patientExams = await workflowStoreAPI.getExaminationsByPatient(sheet.patientId);
          exams[sheet.patientId] = patientExams;
        }
        setExaminations(exams);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleConclusion = async (
    patientId: string, 
    routeSheetId: string,
    serviceId: string,
    conclusion: 'healthy' | 'unhealthy', 
    diagnosis: string,
    recommendations: string,
    doctorSignature: string
  ) => {
    if (!currentUser || !currentDoctor) {
      alert('Ошибка: информация о враче не найдена');
      return;
    }
    
    const doctorName = currentUser?.registrationData?.contactPerson || currentDoctor.name || 'Врач';
    const specialization = currentDoctor.specialization;

    try {
      // Сохраняем заключение врача
      await workflowStoreAPI.addExamination({
        patientId,
        doctorId: currentDoctor.id || '',
        doctorName,
        specialization,
        conclusion,
        notes: diagnosis, // Диагноз в notes
        recommendations,
        doctorSignature,
        examinationDate: new Date().toISOString(),
      });

      // Отмечаем услугу как завершенную в маршрутном листе
      await workflowStoreAPI.updateRouteSheetServiceStatus(routeSheetId, serviceId, 'completed');

      // Обновляем данные
      const updatedSheets = await workflowStoreAPI.getRouteSheets();
      setRouteSheets(updatedSheets);
      
      const patientExams = await workflowStoreAPI.getExaminationsByPatient(patientId);
      setExaminations(prev => ({ ...prev, [patientId]: patientExams }));
      
      // Очищаем форму
      setExaminationData(prev => {
        const newData = { ...prev };
        delete newData[patientId];
        return newData;
      });
      
      alert('Заключение сохранено. Кабинет отмечен как пройденный.');
    } catch (error: any) {
      console.error('Error saving examination:', error);
      alert(error.message || 'Ошибка сохранения заключения');
    }
  };

  const getPatientExaminations = (patientId: string) => {
    return examinations[patientId] || [];
  };

  // Определяем, какие пациенты показывать в зависимости от роли
  const getFilteredPatients = () => {
    if (!currentUser) return [];
    
    // Профпатолог видит всех пациентов с завершенными осмотрами всех врачей
    if (currentUser.clinicRole === 'profpathologist') {
      return routeSheets.filter(rs => {
        // Проверяем, что все услуги завершены
        const allCompleted = rs.services.length > 0 && rs.services.every((s: any) => s.status === 'completed');
        return allCompleted;
      });
    }
    
    // Врач видит только своих пациентов с незавершенными услугами
    if (currentUser.clinicRole === 'doctor' && currentDoctor) {
      const doctorSpecialization = currentDoctor.specialization;
      return routeSheets.filter(rs => {
        // Находим услуги по специализации врача
        const doctorServices = rs.services.filter((s: any) => {
          const serviceSpecialization = s.specialization || s.name;
          return serviceSpecialization === doctorSpecialization;
        });
        // Показываем, если есть незавершенные услуги для этого врача
        return doctorServices.length > 0 && doctorServices.some((s: any) => s.status === 'pending');
      });
    }
    
    return [];
  };

  const patientsForThisDoctor = getFilteredPatients();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Загрузка...</div>;
  }

  return (
    <div>
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {patientsForThisDoctor.map((routeSheet, index) => {
            const patientExams = getPatientExaminations(routeSheet.patientId);
            
            // Для профпатолога показываем все заключения, для врача - только свое
            let thisDoctorExam = null;
            if (currentUser?.clinicRole === 'profpathologist') {
              // Профпатолог видит все заключения, но не заполняет свое здесь
              // (он заполняет экспертизу на другой странице)
            } else if (currentUser?.clinicRole === 'doctor' && currentDoctor) {
              const doctorSpecialization = currentDoctor.specialization;
              thisDoctorExam = patientExams.find((e: any) => {
                const examSpecialization = e.specialization || e.name;
                return examSpecialization === doctorSpecialization;
              });
            }

            return (
              <motion.div
                key={routeSheet.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card>
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{routeSheet.patientName}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {routeSheet.position} • {routeSheet.department} • ИИН: {routeSheet.iin}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {currentUser?.clinicRole === 'profpathologist' ? (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                          Профпатолог - Председатель комиссии
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Все врачи завершили осмотр. Перейдите на страницу &quot;Экспертиза&quot; для вынесения окончательного вердикта.
                        </p>
                        <div className="mt-3 space-y-2">
                          <h5 className="text-sm font-semibold">Заключения врачей:</h5>
                          {patientExams.map((exam: any, idx: number) => (
                            <div key={idx} className="p-2 bg-white dark:bg-gray-800 rounded text-sm">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{exam.specialization || exam.name}:</span>
                                <span className={exam.conclusion === 'healthy' ? 'text-green-600' : 'text-red-600'}>
                                  {exam.conclusion === 'healthy' ? 'Здоров' : 'Не здоров'}
                                </span>
                              </div>
                              {exam.notes && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{exam.notes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4 className="font-medium text-gray-700 dark:text-gray-300">Ваше заключение:</h4>
                        {thisDoctorExam?.conclusion ? (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Stethoscope className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            <div>
                              <p className="font-medium">{thisDoctorExam.doctorName}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {thisDoctorExam.specialization}
                              </p>
                            </div>
                          </div>
                          {thisDoctorExam.conclusion === 'healthy' && (
                            <span className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              Здоров
                            </span>
                          )}
                          {thisDoctorExam.conclusion === 'unhealthy' && (
                            <span className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full flex items-center gap-2">
                              <XCircle className="h-4 w-4" />
                              Не здоров
                            </span>
                          )}
                        </div>
                        {thisDoctorExam.notes && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Диагноз:</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{thisDoctorExam.notes}</p>
                          </div>
                        )}
                        {thisDoctorExam.recommendations && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Рекомендации:</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{thisDoctorExam.recommendations}</p>
                          </div>
                        )}
                        {thisDoctorExam.doctorSignature && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Подпись: {thisDoctorExam.doctorSignature}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Дата: {new Date(thisDoctorExam.examinationDate).toLocaleDateString('ru-RU')}
                        </p>
                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Кабинет отмечен как пройденный
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (!currentDoctor) return;
                              const doctorSpecialization = currentDoctor.specialization;
                              const service = routeSheet.services.find((s: any) => {
                                const serviceSpecialization = s.specialization || s.name;
                                return serviceSpecialization === doctorSpecialization && s.status === 'pending';
                              });
                              setExaminationData(prev => ({
                                ...prev,
                                [routeSheet.patientId]: {
                                  conclusion: 'healthy',
                                  diagnosis: '',
                                  recommendations: '',
                                  doctorSignature: '',
                                }
                              }));
                            }}
                            className="flex-1"
                            disabled={!currentDoctor}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Здоров
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setExaminationData(prev => ({
                                ...prev,
                                [routeSheet.patientId]: {
                                  conclusion: 'unhealthy',
                                  diagnosis: '',
                                  recommendations: '',
                                  doctorSignature: '',
                                }
                              }));
                            }}
                            className="flex-1"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Не здоров
                          </Button>
                        </div>
                        
                        {examinationData[routeSheet.patientId] && (
                          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                            {examinationData[routeSheet.patientId].conclusion === 'unhealthy' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Диагноз (обязательно):
                                </label>
                                <textarea
                                  value={examinationData[routeSheet.patientId].diagnosis}
                                  onChange={(e) => setExaminationData(prev => ({
                                    ...prev,
                                    [routeSheet.patientId]: {
                                      ...prev[routeSheet.patientId],
                                      diagnosis: e.target.value,
                                    }
                                  }))}
                                  placeholder="Укажите диагноз/патологию..."
                                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                                  rows={3}
                                  required
                                />
                              </div>
                            )}
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Рекомендации:
                              </label>
                              <textarea
                                value={examinationData[routeSheet.patientId].recommendations}
                                onChange={(e) => setExaminationData(prev => ({
                                  ...prev,
                                  [routeSheet.patientId]: {
                                    ...prev[routeSheet.patientId],
                                    recommendations: e.target.value,
                                  }
                                }))}
                                placeholder="Укажите рекомендации для пациента..."
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                                rows={2}
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Подпись врача (обязательно):
                              </label>
                              <Input
                                value={examinationData[routeSheet.patientId].doctorSignature}
                                onChange={(e) => setExaminationData(prev => ({
                                  ...prev,
                                  [routeSheet.patientId]: {
                                    ...prev[routeSheet.patientId],
                                    doctorSignature: e.target.value,
                                  }
                                }))}
                                placeholder="ФИО врача"
                                required
                              />
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (!currentDoctor) return;
                                  const doctorSpecialization = currentDoctor.specialization;
                                  const service = routeSheet.services.find((s: any) => {
                                    const serviceSpecialization = s.specialization || s.name;
                                    return serviceSpecialization === doctorSpecialization && s.status === 'pending';
                                  });
                                  const data = examinationData[routeSheet.patientId];
                                  if (!data.doctorSignature) {
                                    alert('Укажите подпись врача');
                                    return;
                                  }
                                  if (data.conclusion === 'unhealthy' && !data.diagnosis) {
                                    alert('Укажите диагноз');
                                    return;
                                  }
                                  handleConclusion(
                                    routeSheet.patientId,
                                    routeSheet.id,
                                    service?.id || '',
                                    data.conclusion!,
                                    data.diagnosis,
                                    data.recommendations,
                                    data.doctorSignature
                                  );
                                }}
                                disabled={!currentDoctor || !examinationData[routeSheet.patientId].doctorSignature || 
                                         (examinationData[routeSheet.patientId].conclusion === 'unhealthy' && !examinationData[routeSheet.patientId].diagnosis)}
                                className="flex-1"
                              >
                                Сохранить заключение и отметить кабинет как пройденный
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setExaminationData(prev => {
                                    const newData = { ...prev };
                                    delete newData[routeSheet.patientId];
                                    return newData;
                                  });
                                }}
                              >
                                Отмена
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {thisDoctorExam?.conclusion === 'unhealthy' && (
                      <div className="mt-3 space-y-3">
                        {showEmergencyNotification === routeSheet.patientId ? (
                          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <h5 className="font-medium text-red-800 dark:text-red-200 mb-3">Экстренное извещение (п. 19)</h5>
                            <div className="space-y-2">
                              <Input
                                label="Тип заболевания"
                                value={emergencyData.diseaseType}
                                onChange={(e) => setEmergencyData({ ...emergencyData, diseaseType: e.target.value })}
                                placeholder="Например: Инфекционное заболевание"
                              />
                              <textarea
                                placeholder="Диагноз..."
                                value={emergencyData.diagnosis}
                                onChange={(e) => setEmergencyData({ ...emergencyData, diagnosis: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                                rows={3}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    const currentUser = userStore.getCurrentUser();
                                    const doctorName = currentUser?.registrationData?.contactPerson || 'Врач';
                                    try {
                                      await workflowStoreAPI.createEmergencyNotification({
                                        patientId: routeSheet.patientId,
                                        patientName: routeSheet.patientName,
                                        iin: routeSheet.iin,
                                        position: routeSheet.position,
                                        department: routeSheet.department,
                                        diseaseType: emergencyData.diseaseType,
                                        diagnosis: emergencyData.diagnosis,
                                        doctorName,
                                      });
                                      // Отправляем извещение
                                      const notifications = await workflowStoreAPI.getEmergencyNotifications();
                                      const notification = notifications.find((n: any) => n.patient_id === routeSheet.patientId);
                                      if (notification) {
                                        await workflowStoreAPI.sendEmergencyNotification(notification.id.toString());
                                      }
                                      alert('Экстренное извещение отправлено в ТСБ/СЭБН и работодателю');
                                      setShowEmergencyNotification(null);
                                      setEmergencyData({ diseaseType: '', diagnosis: '' });
                                    } catch (error: any) {
                                      alert(error.message || 'Ошибка отправки извещения');
                                    }
                                  }}
                                  disabled={!emergencyData.diseaseType || !emergencyData.diagnosis}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Отправить в ТСБ/СЭБН и работодателю
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setShowEmergencyNotification(null);
                                    setEmergencyData({ diseaseType: '', diagnosis: '' });
                                  }}
                                >
                                  Отмена
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowEmergencyNotification(routeSheet.patientId)}
                            className="w-full border-red-300 text-red-700 dark:border-red-700 dark:text-red-300"
                          >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Отправить экстренное извещение (инфекционное заболевание)
                          </Button>
                        )}
                      </div>
                    )}
                      </>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {patientsForThisDoctor.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <Stethoscope className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Нет пациентов для осмотра</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Пациенты появятся здесь после генерации маршрутных листов и прохождения вашего кабинета
              </p>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
