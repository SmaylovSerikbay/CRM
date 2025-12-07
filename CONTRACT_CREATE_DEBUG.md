# Отладка создания договора

## Проблема
При попытке создать договор для незарегистрированной организации кнопка "Создать и отправить" не работает.

## Найденная причина
Поле `amount` в `ContractSerializer` было определено как `SerializerMethodField()`, что делает его read-only. При создании договора значение не сохранялось в базу данных, что приводило к ошибке:
```
null value in column "amount" of relation "api_contract" violates not-null constraint
```

## Внесенные изменения

### 1. Исправлен ContractSerializer (backend/api/serializers.py)
- Изменены поля `amount`, `employer_bin`, `employer_phone` с `SerializerMethodField()` на обычные поля
- `amount` теперь `DecimalField(max_digits=10, decimal_places=2, required=True)`
- `employer_bin` теперь `CharField(max_length=12, required=False, allow_blank=True)`
- `employer_phone` теперь `CharField(max_length=20, required=False, allow_blank=True)`
- Добавлен метод `to_representation()` для скрытия конфиденциальных данных от субподрядчика при чтении
- Удалены дублирующиеся методы `get_amount()`, `get_employer_bin()`, `get_employer_phone()`

### 2. Добавлено логирование в handleSubmit (frontend)
- Добавлены console.log для отслеживания процесса создания договора
- Логи помогут понять, на каком этапе происходит ошибка

### 3. Улучшена валидация (frontend)
- Добавлена проверка длины телефона (должно быть 11 цифр)
- Добавлена проверка длины БИН (должно быть 12 цифр)
- Убраны HTML5 атрибуты pattern и minLength из PhoneInput, которые могли блокировать отправку

### 4. Добавлено состояние загрузки (frontend)
- Добавлено состояние `isSubmitting` для отображения процесса создания
- Кнопка теперь показывает "Создание..." с анимацией во время отправки
- Кнопка блокируется во время отправки, чтобы избежать повторных нажатий

## Как проверить

1. Откройте браузер и перейдите на страницу договоров клиники
2. Нажмите "Создать договор"
3. Заполните форму:
   - БИН: 12 цифр (например, 910719401152)
   - Телефон: полный номер (например, +7 (776) 545 12 71)
   - Остальные поля
4. Откройте консоль браузера (F12 → Console)
5. Нажмите "Создать и отправить"
6. Проверьте консоль на наличие логов:
   - "handleSubmit called" - функция вызвана
   - "Validation passed, creating contract..." - валидация прошла
   - Если есть ошибки, они будут показаны в консоли

## Возможные причины проблемы

### 1. HTML5 валидация блокирует отправку
- **Решение**: Убраны атрибуты pattern и minLength
- **Проверка**: Если форма не отправляется, проверьте, все ли required поля заполнены

### 2. Ошибка на бэкенде
- **Проверка**: Смотрите логи бэкенда: `docker-compose logs backend --tail=50`
- **Возможные ошибки**:
  - Ошибка валидации данных
  - Ошибка при создании записи в БД
  - Ошибка при отправке уведомления

### 3. Ошибка в API клиенте
- **Проверка**: Смотрите Network tab в DevTools
- **Что проверить**:
  - Отправляется ли POST запрос на /contracts/
  - Какой статус ответа (200, 400, 500)
  - Какие данные отправляются в теле запроса

### 4. Проблема с состоянием формы
- **Проверка**: Смотрите логи в консоли
- **Что проверить**:
  - Все ли поля formData заполнены
  - Правильно ли форматируются данные (parseFloat, parseInt)

## Дополнительная отладка

Если проблема не решена, добавьте больше логов:

```typescript
console.log('Form data:', {
  employer_bin: formData.employer_bin,
  employer_phone: formData.employer_phone,
  contract_number: formData.contract_number,
  contract_date: formData.contract_date,
  amount: formData.amount,
  people_count: formData.people_count,
  execution_date: formData.execution_date,
});
```

## Проверка бэкенда

Проверьте, что бэкенд правильно обрабатывает создание договора:

```bash
# Проверить логи бэкенда
docker-compose logs backend --tail=100 -f

# Проверить, что эндпоинт доступен
curl -X POST http://localhost:8001/api/contracts/ \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "1",
    "employer_bin": "910719401152",
    "employer_phone": "77765451271",
    "contract_number": "1234",
    "contract_date": "2025-12-06",
    "amount": 345500,
    "people_count": 7000,
    "execution_date": "2025-12-31"
  }'
```

## Следующие шаги

1. Проверьте консоль браузера на наличие ошибок
2. Проверьте Network tab на наличие запросов
3. Проверьте логи бэкенда
4. Если проблема не решена, предоставьте скриншоты консоли и Network tab
