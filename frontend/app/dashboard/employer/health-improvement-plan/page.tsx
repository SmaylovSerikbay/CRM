'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { FileText, Download, Calendar, CheckCircle } from 'lucide-react';
import { workflowStoreAPI } from '@/lib/store/workflow-store-api';

export default function HealthImprovementPlanPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlan, setNewPlan] = useState({
    year: new Date().getFullYear(),
    planData: {
      activities: [],
      responsiblePersons: [],
      deadlines: [],
    },
  });

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const data = await workflowStoreAPI.getHealthImprovementPlans();
        setPlans(data);
      } catch (error) {
        console.error('Error loading plans:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPlans();
  }, []);

  const handleCreatePlan = async () => {
    setIsCreating(true);
    try {
      await workflowStoreAPI.createHealthImprovementPlan(newPlan.year, newPlan.planData);
      const updated = await workflowStoreAPI.getHealthImprovementPlans();
      setPlans(updated);
      setNewPlan({
        year: new Date().getFullYear(),
        planData: {
          activities: [],
          responsiblePersons: [],
          deadlines: [],
        },
      });
      alert('План оздоровительных мероприятий создан');
    } catch (error: any) {
      alert(error.message || 'Ошибка создания плана');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSendToTSB = async (planId: string) => {
    try {
      await workflowStoreAPI.updateHealthImprovementPlan(planId, { status: 'pending_tsb' });
      const updated = await workflowStoreAPI.getHealthImprovementPlans();
      setPlans(updated);
      alert('План отправлен на согласование в ТСБ/СЭБН');
    } catch (error: any) {
      alert(error.message || 'Ошибка отправки плана');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Загрузка...</div>;
  }

  return (
    <div>
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">План оздоровительных мероприятий</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Составление годового плана оздоровительных мероприятий для согласования с ТСБ/СЭБН (п. 20)
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Card className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Создать новый план</h2>
          <div className="space-y-4">
            <Input
              type="number"
              label="Год"
              value={newPlan.year}
              onChange={(e) => setNewPlan({ ...newPlan, year: parseInt(e.target.value) })}
            />
            <Button
              onClick={handleCreatePlan}
              isLoading={isCreating}
              disabled={!newPlan.year}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Создать план
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">План на {plan.year} год</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Статус: {plan.status === 'draft' ? 'Черновик' : plan.status === 'pending_tsb' ? 'Ожидает согласования ТСБ/СЭБН' : 'Утвержден'}
                    </p>
                  </div>
                  {plan.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => handleSendToTSB(plan.id.toString())}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Отправить на согласование
                    </Button>
                  )}
                  {plan.status === 'approved' && (
                    <span className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Утвержден
                    </span>
                  )}
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // TODO: Генерация PDF
                      alert('PDF плана будет сгенерирован');
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Скачать PDF
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {plans.length === 0 && (
          <Card>
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Нет планов оздоровительных мероприятий</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Создайте новый план для согласования с ТСБ/СЭБН
              </p>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}

