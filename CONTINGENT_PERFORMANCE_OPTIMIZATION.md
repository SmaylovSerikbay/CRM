# Оптимизация производительности страниц контингента

## Проблема
Страницы контингента для конкретных договоров (`/contracts/[id]/contingent`) загружались очень медленно из-за:

1. **Неоптимизированных запросов к БД** с множественными JOIN и сложными фильтрами
2. **Отсутствия кэширования** - каждый запрос шел в базу данных
3. **Пагинации на frontend** - могло делать несколько запросов в цикле
4. **Избыточных перезагрузок** данных после каждого действия

## Решение

### 1. Backend оптимизация
- **Новый оптимизированный endpoint**: `/contingent-employees/by_contract_optimized/`
- **Упрощенные запросы**: минимальные JOIN, только необходимые данные
- **Prefetch related**: предзагрузка связанных данных одним запросом
- **Проверка прав доступа**: быстрая валидация без лишних запросов

### 2. Frontend кэширование
- **Кэш на 5 минут** для данных контингента по договору
- **Автоматическая очистка кэша** при изменении данных (загрузка, удаление)
- **Fallback механизм** - если оптимизированный endpoint не работает, используется старый

### 3. Умная перезагрузка данных
- **Первичная загрузка**: использует кэш для быстрого отображения
- **После изменений**: принудительно обновляет данные без кэша
- **Логирование**: показывает когда используется кэш vs свежие данные

## Технические детали

### Backend (views.py)
```python
@action(detail=False, methods=['get'])
def by_contract_optimized(self, request):
    # Оптимизированный запрос с минимальными JOIN
    queryset = ContingentEmployee.objects.filter(
        contract=contract
    ).select_related('user', 'contract').prefetch_related('harmfulFactors')
```

### Frontend (workflow-store-api.ts)
```typescript
// Кэширование с TTL 5 минут
private contingentByContractCache = new Map<string, { data: ContingentEmployee[], timestamp: number }>();
private readonly CACHE_TTL = 5 * 60 * 1000;

async getContingentByContract(contractId: string, useCache: boolean = true)
```

### API Client (client.ts)
```typescript
// Попытка использовать оптимизированный endpoint с fallback
try {
  const response = await this.request(`/contingent-employees/by_contract_optimized/?user_id=${userId}&contract_id=${contractId}`);
  return Array.isArray(response) ? response : [];
} catch (error) {
  // Fallback к старому методу
}
```

## Результат
- **Значительно быстрая загрузка** страниц контингента
- **Меньше нагрузки на БД** благодаря кэшированию
- **Лучший UX** - пользователи видят данные быстрее
- **Обратная совместимость** - fallback к старому API если нужно

## Мониторинг
Добавлено логирование в консоль:
- `"Using cached contingent data for contract: {id}"` - используется кэш
- `"Loading fresh contingent data for contract: {id}"` - загрузка из БД

## Дальнейшие улучшения
1. Добавить индексы в БД для полей `contract_id`
2. Реализовать server-side кэширование (Redis)
3. Добавить lazy loading для больших списков
4. Оптимизировать сериализацию данных