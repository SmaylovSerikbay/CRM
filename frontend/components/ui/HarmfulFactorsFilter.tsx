'use client';

import { useState, useEffect } from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { Filter, X } from 'lucide-react';

// Список стандартных вредных факторов согласно приказу № ҚР ДСМ-131/2020
const HARMFUL_FACTORS_OPTIONS = [
  'п.1 «Работы, связанные с воздействием химических факторов»',
  'п.2 «Работы с канцерогенными веществами»',
  'п.3 «Работы с пестицидами и агрохимикатами»',
  'п.4 «Работы, связанные с воздействием биологических факторов»',
  'п.5 «Работы, выполняемые в условиях повышенного шума»',
  'п.6 «Работы, выполняемые в условиях вибрации»',
  'п.7 «Работы, выполняемые в условиях ионизирующего излучения»',
  'п.8 «Работы, выполняемые в условиях неионизирующих излучений»',
  'п.9 «Работы, выполняемые при повышенной или пониженной температуре воздуха»',
  'п.10 «Работы в замкнутых пространствах»',
  'п.11 «Работы на высоте»',
  'п.12 «Работы, связанные с подъемом и перемещением тяжестей»',
  'п.13 «Работы в ночное время»',
  'п.14 «Работа на ПК»',
  'п.15 «Работы, связанные с эмоциональным и умственным перенапряжением»',
  'п.16 «Работы, связанные с повышенной ответственностью»',
  'п.17 «Работы вахтовым методом»',
  'п.18 «Подземные работы»',
  'п.19 «Работы на транспорте»',
  'п.20 «Работы, связанные с воздействием пыли»',
  'п.21 «Работы с горюче-смазочными материалами»',
  'п.22 «Работы, связанные с воздействием нефти и нефтепродуктов»',
  'п.23 «Работы в условиях повышенной загазованности»',
  'п.24 «Работы в условиях недостатка кислорода»',
  'п.25 «Работы в условиях повышенной влажности»',
  'п.26 «Работы, связанные с виброинструментом»',
  'п.27 «Работы на конвейерах»',
  'п.28 «Работы на строительных площадках»',
  'п.29 «Работы в металлургическом производстве»',
  'п.30 «Работы в горнодобывающей промышленности»',
  'п.31 «Работы в деревообрабатывающем производстве»',
  'п.32 «Работы в текстильной и швейной промышленности»',
  'п.33 «Профессии и работы»',
];

interface HarmfulFactorsFilterProps {
  selectedFactors: string[];
  onFactorsChange: (factors: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function HarmfulFactorsFilter({ 
  selectedFactors, 
  onFactorsChange, 
  placeholder = "Фильтр по вредным факторам...",
  className = ""
}: HarmfulFactorsFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.harmful-factors-filter')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredFactors = HARMFUL_FACTORS_OPTIONS.filter(factor =>
    factor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFactor = (factor: string) => {
    if (selectedFactors.includes(factor)) {
      onFactorsChange(selectedFactors.filter(f => f !== factor));
    } else {
      onFactorsChange([...selectedFactors, factor]);
    }
  };

  const clearAll = () => {
    onFactorsChange([]);
    setSearchQuery('');
  };

  return (
    <div className={`relative harmful-factors-filter ${className}`}>
      {/* Кнопка фильтра */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative ${selectedFactors.length > 0 ? 'border-blue-500 text-blue-600' : ''}`}
      >
        <Filter className="h-4 w-4 mr-2" />
        Вредные факторы
        {selectedFactors.length > 0 && (
          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full">
            {selectedFactors.length}
          </span>
        )}
      </Button>

      {/* Выпадающий список */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          {/* Заголовок и поиск */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Фильтр по вредным факторам
              </h3>
              {selectedFactors.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAll}
                  className="text-xs"
                >
                  Очистить
                </Button>
              )}
            </div>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск факторов..."
              className="text-sm"
            />
          </div>

          {/* Выбранные факторы */}
          {selectedFactors.length > 0 && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Выбрано ({selectedFactors.length}):
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedFactors.map((factor) => (
                  <span
                    key={factor}
                    className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md"
                  >
                    {factor.length > 25 ? `${factor.substring(0, 25)}...` : factor}
                    <button
                      onClick={() => toggleFactor(factor)}
                      className="ml-1 text-blue-500 hover:text-blue-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Список факторов */}
          <div className="max-h-64 overflow-y-auto">
            {filteredFactors.map((factor) => {
              const isSelected = selectedFactors.includes(factor);
              return (
                <div
                  key={factor}
                  onClick={() => toggleFactor(factor)}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Обработка в onClick родителя
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-900 dark:text-white">
                      {factor}
                    </span>
                  </div>
                </div>
              );
            })}
            {filteredFactors.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                Факторы не найдены
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { HARMFUL_FACTORS_OPTIONS };