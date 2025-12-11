'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, Route, CheckCircle, Clock, AlertCircle, Plus, User, Calendar } from 'lucide-react';
import { workflowStoreAPI, RouteSheet } from '@/lib/store/workflow-store-api';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

export default function ContractRouteSheetsPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const contractId = params.contractId as string;
  
  const [contract, setContract] = useState<any>(null);
  const [routeSheets, setRouteSheets] = useState<RouteSheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (contractId) {
      loadData();
    }
  }, [contractId]);

  const loadData = async () => {
    try {
      // Загружаем основную информацию о договоре
      const contracts = await workflowStoreAPI.getContracts();
      const foundContract = contracts.find((c: any) => c.id.toString() === contractId);
      
      if (!foundContract) {
        showToast('Договор не найден', 'error');
        router.push('/dashboard/clinic/contracts');
        return;
      }

      setContract(foundContract);

      // Загружаем маршрутные листы (пока все, в будущем нужно добавить фильтрацию по договору)
      const routeSheetsData = await workflowStoreAPI.getRouteSheets();
      setRouteSheets(routeSheetsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Ошибка загрузки данных', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getServiceStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getServiceStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Ожидает',
      completed: 'Выполнено',
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Договор не найден
          </h2>
          <Link href="/dashboard/clinic/contracts">
            <Button>Вернуться к списку договоров</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Хлебные крошки */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Link href="/dashboard/clinic/contracts" className="hover:text-blue-600 dark:hover:text-blue-400">
              Договоры
            </Link>
            <span>/</span>
            <Link href={`/dashboard/clinic/contracts/${contractId}`} className="hover:text-blue-600 dark:hover:text-blue-400">
              Договор №{contract.contract_number}
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white">Маршрутные листы</span>
          </div>

          {/* Заголовок */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/dashboard/clinic/contracts/${contractId}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Назад к договору
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Маршрутные листы
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Договор №{contract.contract_number} от {new Date(contract.contract_date).toLocaleDateString('ru-RU')}
                </p>
              </div>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Создать маршрутный лист
            </Button>
          </div>

          {/* Список маршрутных листов */}
          {routeSheets.length === 0 ? (
            <Card className="p-12 text-center">
              <Route className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Маршрутные листы не созданы
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Создайте маршрутные листы для организации прохождения медицинских осмотров сотрудниками
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Создать первый маршрутный лист
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {routeSheets.map((sheet) => (
                <Card key={sheet.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {sheet.patientName}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {sheet.position} • {sheet.department}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          ИИН: {sheet.iin}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(sheet.visitDate).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-500">
                        Услуг: {sheet.services.length}
                      </div>
                    </div>
                  </div>

                  {/* Список услуг */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Назначенные услуги:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {sheet.services.map((service) => (
                        <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900 dark:text-white">
                              {service.name}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Кабинет: {service.cabinet}
                              {service.specialization && ` • ${service.specialization}`}
                            </p>
                            {service.time && (
                              <p className="text-xs text-gray-500 dark:text-gray-500">
                                Время: {service.time}
                              </p>
                            )}
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${getServiceStatusColor(service.status)}`}>
                            {getServiceStatusLabel(service.status)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Прогресс выполнения */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Прогресс:
                        </div>
                        <div className="flex items-center gap-1">
                          {(() => {
                            const completed = sheet.services.filter(s => s.status === 'completed').length;
                            const total = sheet.services.length;
                            const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
                            
                            return (
                              <>
                                <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-green-500 transition-all duration-300"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {completed}/{total} ({percentage}%)
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          Просмотр
                        </Button>
                        <Button size="sm">
                          Редактировать
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}