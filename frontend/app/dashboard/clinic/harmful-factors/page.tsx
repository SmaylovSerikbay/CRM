'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search, Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/components/ui/Toast';

// Список стандартных вредных факторов согласно приказу № ҚР ДСМ-131/2020
const STANDARD_HARMFUL_FACTORS = [
  "п.1 «Работы, связанные с воздействием химических факторов»",
  "п.2 «Работы с канцерогенными веществами»",
  "п.3 «Работы с пестицидами и агрохимикатами»",
  "п.4 «Работы, связанные с воздействием биологических факторов»",
  "п.5 «Работы, выполняемые в условиях повышенного шума»",
  "п.6 «Работы, выполняемые в условиях вибрации»",
  "п.7 «Работы, выполняемые в условиях ионизирующего излучения»",
  "п.8 «Работы, выполняемые в условиях неионизирующих излучений»",
  "п.9 «Работы, выполняемые при повышенной или пониженной температуре воздуха»",
  "п.10 «Работы в замкнутых пространствах»",
  "п.11 «Работы на высоте»",
  "п.12 «Работы, связанные с подъемом и перемещением тяжестей»",
  "п.13 «Работы в ночное время»",
  "п.14 «Работа на ПК»",
  "п.15 «Работы, связанные с эмоциональным и умственным перенапряжением»",
  "п.16 «Работы, связанные с повышенной ответственностью»",
  "п.17 «Работы вахтовым методом»",
  "п.18 «Подземные работы»",
  "п.19 «Работы на транспорте»",
  "п.20 «Работы, связанные с воздействием пыли»",
  "п.21 «Работы с горюче-смазочными материалами»",
  "п.22 «Работы, связанные с воздействием нефти и нефтепродуктов»",
  "п.23 «Работы в условиях повышенной загазованности»",
  "п.24 «Работы в условиях недостатка кислорода»",
  "п.25 «Работы в условиях повышенной влажности»",
  "п.26 «Работы, связанные с виброинструментом»",
  "п.27 «Работы на конвейерах»",
  "п.28 «Работы на строительных площадках»",
  "п.29 «Работы в металлургическом производстве»",
  "п.30 «Работы в горнодобывающей промышленности»",
  "п.31 «Работы в деревообрабатывающем производстве»",
  "п.32 «Работы в текстильной и швейной промышленности»",
  "п.33 «Профессии и работы»"
];

export default function HarmfulFactorsPage() {
  const { showToast } = useToast();
  const [harmfulFactors, setHarmfulFactors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFactor, setNewFactor] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    loadHarmfulFactors();
  }, []);

  const loadHarmfulFactors = async () => {
    try {
      const factors = await apiClient.getHarmfulFactorsList();
      setHarmfulFactors(factors);
    } catch (error) {
      console.error('Error loading harmful factors:', error);
      // Если не удалось загрузить с сервера, используем стандартный список
      setHarmfulFactors(STANDARD_HARMFUL_FACTORS);
      showToast('Загружен стандартный список вредных факторов', 'info');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFactors = harmfulFactors.filter(factor =>
    factor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddFactor = () => {
    if (!newFactor.trim()) {
      showToast('Введите название вредного фактора', 'warning');
      return;
    }

    if (harmfulFactors.includes(newFactor.trim())) {
      showToast('Такой вредный фактор уже существует', 'warning');
      return;
    }

    setHarmfulFactors([...harmfulFactors, newFactor.trim()]);
    setNewFactor('');
    setShowAddForm(false);
    showToast('Вредный фактор добавлен', 'success');
  };

  const handleEditFactor = (index: number) => {
    setEditingIndex(index);
    setEditValue(harmfulFactors[index]);
  };

  const handleSaveEdit = () => {
    if (!editValue.trim()) {
      showToast('Введите название вредного фактора', 'warning');
      return;
    }

    if (editingIndex !== null) {
      const updated = [...harmfulFactors];
      updated[editingIndex] = editValue.trim();
      setHarmfulFactors(updated);
      setEditingIndex(null);
      setEditValue('');
      showToast('Вредный фактор обновлен', 'success');
    }
  };

  const handleDeleteFactor = (index: number) => {
    if (confirm('Вы уверены, что хотите удалить этот вредный фактор?')) {
      const updated = harmfulFactors.filter((_, i) => i !== index);
      setHarmfulFactors(updated);
      showToast('Вредный фактор удален', 'success');
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Вредные факторы
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Управление списком вредных производственных факторов
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Добавить фактор
        </Button>
      </div>

      {/* Поиск */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Поиск вредных факторов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Форма добавления */}
      {showAddForm && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Добавить новый вредный фактор</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Название вредного фактора"
              value={newFactor}
              onChange={(e) => setNewFactor(e.target.value)}
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && handleAddFactor()}
            />
            <Button onClick={handleAddFactor}>Добавить</Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddForm(false);
                setNewFactor('');
              }}
            >
              Отмена
            </Button>
          </div>
        </Card>
      )}

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Всего факторов</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {harmfulFactors.length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Search className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Найдено</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {filteredFactors.length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Стандартных</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {STANDARD_HARMFUL_FACTORS.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Список факторов */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          Список вредных факторов ({filteredFactors.length})
        </h3>
        
        {filteredFactors.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {searchQuery ? 'Факторы не найдены' : 'Список пуст'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFactors.map((factor, index) => {
              const originalIndex = harmfulFactors.indexOf(factor);
              const isEditing = editingIndex === originalIndex;
              
              return (
                <motion.div
                  key={originalIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  {isEditing ? (
                    <div className="flex-1 flex gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1"
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                      />
                      <Button size="sm" onClick={handleSaveEdit}>
                        Сохранить
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                        Отмена
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-gray-900 dark:text-white">
                        {factor}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditFactor(originalIndex)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteFactor(originalIndex)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}