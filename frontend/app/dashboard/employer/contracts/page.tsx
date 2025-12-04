'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { FileText, CheckCircle, Clock, Send, X, Download, Upload, History } from 'lucide-react';
import { workflowStoreAPI } from '@/lib/store/workflow-store-api';
import { userStore } from '@/lib/store/user-store';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

interface Contract {
  id: string;
  contract_number: string;
  contract_date: string;
  amount: number;
  people_count: number;
  execution_date: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'executed' | 'cancelled';
  employer_bin?: string;
  employer_phone?: string;
  employer_name?: string;
  clinic_name?: string;
  notes?: string;
  createdAt: string;
  approvedByEmployerAt?: string;
  approvedByClinicAt?: string;
  sentAt?: string;
  executedAt?: string;
  history?: any[];
}

interface ContractHistoryItem {
  id: string;
  action: string;
  user_role: string;
  user_name: string;
  comment: string;
  old_status: string;
  new_status: string;
  changes: any;
  created_at: string;
}

function EmployerContractsContent() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const binFromUrl = searchParams.get('bin');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showSignForm, setShowSignForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [contractHistory, setContractHistory] = useState<ContractHistoryItem[]>([]);

  useEffect(() => {
    loadContracts();
    
    // Если есть БИН в URL, показываем сообщение о договоре
    if (binFromUrl) {
      setTimeout(() => {
        showToast('Вам отправлен договор на согласование. Пожалуйста, ознакомьтесь и подпишите его.', 'info', 8000);
      }, 500);
    }
  }, [binFromUrl]);

  const loadContracts = async () => {
    try {
      const data: any[] = await workflowStoreAPI.getContracts();
      // Маппим данные из API в наш интерфейс
      const mappedContracts: Contract[] = data.map((c: any) => ({
        id: c.id.toString(),
        contract_number: c.contract_number,
        contract_date: c.contract_date,
        amount: typeof c.amount === 'string' ? parseFloat(c.amount) : c.amount,
        people_count: c.people_count,
        execution_date: c.execution_date,
        status: c.status,
        employer_bin: c.employer_bin,
        employer_phone: c.employer_phone,
        employer_name: c.employer_name,
        clinic_name: c.clinic_name,
        notes: c.notes,
        createdAt: c.created_at,
        approvedByEmployerAt: c.approved_by_employer_at,
        approvedByClinicAt: c.approved_by_clinic_at,
        sentAt: c.sent_at,
        executedAt: c.executed_at,
      }));
      setContracts(mappedContracts);
      
      // Если есть БИН в URL, находим соответствующий договор
      if (binFromUrl) {
        const contract = mappedContracts.find((c: Contract) => c.employer_bin === binFromUrl);
        if (contract) {
          setSelectedContract(contract);
        }
      }
    } catch (error) {
      console.error('Error loading contracts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (contractId: string) => {
    if (!confirm('Вы уверены, что хотите подписать этот договор?')) return;
    
    try {
      const result = await workflowStoreAPI.approveContract(contractId);
      // Небольшая задержка для обновления базы данных
      await new Promise(resolve => setTimeout(resolve, 300));
      // Обновляем список договоров
      await loadContracts();
      // Сбрасываем выбранный договор, чтобы обновился UI
      setSelectedContract(null);
      showToast('Договор успешно подписан!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Ошибка подписания договора', 'error');
    }
  };

  const handleReject = async (contractId: string) => {
    if (!rejectReason.trim()) {
      showToast('Пожалуйста, укажите причину отклонения', 'warning');
      return;
    }
    
    try {
      await workflowStoreAPI.rejectContract(contractId, rejectReason);
      showToast('Договор отклонен. Клиника получит уведомление.', 'success');
      setRejectReason('');
      setShowRejectForm(null);
      loadContracts();
    } catch (error: any) {
      showToast(error.message || 'Ошибка отклонения договора', 'error');
    }
  };

  const handleExecute = async (contractId: string) => {
    if (!confirm('Отметить договор как исполненный?')) return;
    
    try {
      await workflowStoreAPI.executeContract(contractId);
      showToast('Договор отмечен как исполненный!', 'success');
      loadContracts();
      setSelectedContract(null);
    } catch (error: any) {
      showToast(error.message || 'Ошибка', 'error');
    }
  };

  const handleShowHistory = async (contractId: string) => {
    try {
      const history = await workflowStoreAPI.getContractHistory(contractId);
      setContractHistory(history);
      setShowHistory(contractId);
    } catch (error: any) {
      showToast(error.message || 'Ошибка загрузки истории', 'error');
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      created: 'Создан',
      updated: 'Обновлен',
      sent_for_approval: 'Отправлен на согласование',
      approved: 'Согласован',
      rejected: 'Отклонен',
      resent_for_approval: 'Повторно отправлен на согласование',
      cancelled: 'Отменен',
      executed: 'Исполнен',
    };
    return labels[action] || action;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Черновик',
      pending_approval: 'Ожидает согласования',
      approved: 'Согласован',
      rejected: 'Отклонен',
      sent: 'Отправлен',
      executed: 'Исполнен',
      cancelled: 'Отменен',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      pending_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      executed: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
              <h1 className="text-2xl font-bold">Договоры</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Просмотр и управление договорами с клиниками
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {binFromUrl && contracts.length === 0 && (
          <Card className="mb-8 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="p-4">
              <p className="text-blue-800 dark:text-blue-200">
                Вам отправлен договор с БИН: {binFromUrl}. Если у вас еще нет аккаунта, пожалуйста, зарегистрируйтесь.
              </p>
            </div>
          </Card>
        )}

        <div className="grid gap-6">
          {contracts.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Нет договоров</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Договоры с клиниками будут отображаться здесь после их создания
                </p>
              </div>
            </Card>
          ) : (
            contracts.map((contract) => (
              <Card key={contract.id}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">Договор №{contract.contract_number}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
                        {getStatusLabel(contract.status)}
                      </span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Дата договора</p>
                        <p className="font-medium">{contract.contract_date}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Сумма</p>
                        <p className="font-medium">{contract.amount.toLocaleString()} ₸</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Количество сотрудников</p>
                        <p className="font-medium">{contract.people_count}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Дата исполнения</p>
                        <p className="font-medium">{contract.execution_date}</p>
                      </div>
                      {contract.clinic_name && (
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Клиника</p>
                          <p className="font-medium">{contract.clinic_name}</p>
                        </div>
                      )}
                      {contract.notes && (
                        <div className="md:col-span-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Примечания</p>
                          <p className="font-medium">{contract.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex flex-col gap-2">
                    {(contract.status === 'sent' || contract.status === 'pending_approval') && !contract.approvedByEmployerAt ? (
                      <>
                        <Button onClick={() => handleApprove(contract.id)}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Подписать
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowRejectForm(showRejectForm === contract.id ? null : contract.id)}
                          className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Отклонить
                        </Button>
                      </>
                    ) : null}
                    {contract.status === 'approved' && (
                      <Button onClick={() => handleExecute(contract.id)} variant="outline">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Отметить исполненным
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedContract(selectedContract?.id === contract.id ? null : contract)}
                    >
                      {selectedContract?.id === contract.id ? 'Скрыть' : 'Подробнее'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleShowHistory(contract.id)}
                    >
                      История
                    </Button>
                  </div>
                </div>
                
                {showRejectForm === contract.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800"
                  >
                    <h4 className="font-semibold mb-3">Причина отклонения</h4>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Укажите причину отклонения договора..."
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent"
                      rows={4}
                      required
                    />
                    <div className="flex gap-2 mt-3">
                      <Button onClick={() => handleReject(contract.id)} className="bg-red-600 hover:bg-red-700">
                        Отклонить договор
                      </Button>
                      <Button variant="outline" onClick={() => { setShowRejectForm(null); setRejectReason(''); }}>
                        Отмена
                      </Button>
                    </div>
                  </motion.div>
                )}

                {showHistory === contract.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">История изменений</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowHistory(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {contractHistory.length === 0 ? (
                        <p className="text-sm text-gray-500">Нет записей в истории</p>
                      ) : (
                        contractHistory.map((item) => (
                          <div key={item.id} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-sm">{getActionLabel(item.action)}</span>
                                  {item.new_status && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(item.new_status)}`}>
                                      {getStatusLabel(item.new_status)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {item.user_name || 'Система'} ({item.user_role === 'clinic' ? 'Клиника' : 'Работодатель'})
                                </p>
                                {item.comment && (
                                  <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">
                                    {item.comment}
                                  </p>
                                )}
                                {item.changes && Object.keys(item.changes).length > 0 && (
                                  <div className="mt-2 text-xs">
                                    <p className="font-medium mb-1">Изменения:</p>
                                    {Object.entries(item.changes).map(([key, value]: [string, any]) => (
                                      <p key={key} className="text-gray-600 dark:text-gray-400">
                                        {key}: {value.old} → {value.new}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                {new Date(item.created_at).toLocaleString('ru-RU')}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}

                {selectedContract?.id === contract.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800"
                  >
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">ID договора: {contract.id}</p>
                      {contract.createdAt && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Создан: {new Date(contract.createdAt).toLocaleString('ru-RU')}
                        </p>
                      )}
                      {contract.approvedByEmployerAt && (
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Подписан работодателем: {new Date(contract.approvedByEmployerAt).toLocaleString('ru-RU')}
                        </p>
                      )}
                      {contract.approvedByClinicAt && (
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Подписан клиникой: {new Date(contract.approvedByClinicAt).toLocaleString('ru-RU')}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default function EmployerContractsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    }>
      <EmployerContractsContent />
    </Suspense>
  );
}

