# Изменения в системе статусов договоров

## Дата: 5 декабря 2024

## Проблема
При согласовании договора система сразу меняла статус на "исполнен", что было неправильно. Статус "исполнен" должен устанавливаться только после того, как все сотрудники прошли медосмотр.

## Решение

### 1. Добавлены новые статусы договора

**Старые статусы:**
- draft (Черновик)
- pending_approval (Ожидает согласования)
- approved (Согласован)
- sent (Отправлен)
- executed (Исполнен)
- cancelled (Отменен)

**Новые статусы:**
- draft (Черновик)
- pending_approval (Ожидает согласования)
- approved (Согласован)
- **active (Действует)** ← НОВЫЙ
- **in_progress (В процессе исполнения)** ← НОВЫЙ
- **partially_executed (Частично исполнен)** ← НОВЫЙ
- executed (Исполнен)
- cancelled (Отменен)

### 2. Изменена логика переходов между статусами

#### При согласовании (approve):
```
Было:
  обе стороны подписали → approved (Согласован)

Стало:
  обе стороны подписали → active (Действует)
```

#### При исполнении (execute):
```
Было:
  execute() → executed (Исполнен) - сразу!

Стало:
  execute() → in_progress (В процессе исполнения)
  первая экспертиза → partially_executed (Частично исполнен)
  все экспертизы → executed (Исполнен)
```

### 3. Автоматическое обновление статуса

Система теперь автоматически обновляет статус договора при:
- Создании/обновлении экспертизы с вердиктом профпатолога
- Вызове API метода `check_completion`

**Логика расчета:**
```python
completed = количество_сотрудников_с_экспертизой
total = contract.people_count
percentage = (completed / total) * 100

if percentage == 100:
    status = 'executed'
elif percentage > 0:
    status = 'partially_executed'
```

## Файлы изменены

### Backend:
1. `backend/api/models.py` - добавлены новые статусы в Contract.STATUS_CHOICES
2. `backend/api/views.py`:
   - Изменена логика метода `approve()` - теперь ставит статус `active`
   - Изменена логика метода `execute()` - теперь ставит статус `in_progress`
   - Добавлен метод `check_completion()` - проверка прогресса исполнения
   - Добавлен метод `_update_contract_status()` в ExpertiseViewSet - автообновление статуса
3. `backend/api/migrations/0012_update_contract_status_choices.py` - миграция БД

### Frontend:
1. `frontend/app/dashboard/clinic/contracts/page.tsx` - обновлены типы и отображение статусов
2. `frontend/app/dashboard/employer/contracts/page.tsx` - обновлены типы и отображение статусов

### Документация:
1. `docs/CONTRACT_STATUS_FLOW.md` - полное описание жизненного цикла договора
2. `docs/CHANGELOG_CONTRACT_STATUS.md` - этот файл

## Применение изменений

### Для dev окружения:
```bash
make dev
```

### Для prod окружения:
```bash
make down-prod
make build-prod
make up-prod
docker compose exec backend python manage.py migrate
```

## API изменения

### Новый endpoint для проверки прогресса:
```
GET /api/contracts/{id}/check_completion/

Response:
{
  "status": "partially_executed",
  "completed": 15,
  "total": 50,
  "percentage": 30.0,
  "message": "Завершено 15 из 50 медосмотров"
}
```

## Обратная совместимость

Существующие договоры со статусом `approved` останутся в этом статусе. При следующем согласовании они автоматически перейдут в статус `active`.

## Тестирование

1. Создайте договор от имени клиники
2. Согласуйте его от имени работодателя
3. Согласуйте его от имени клиники
4. Проверьте, что статус стал `active` (Действует)
5. Вызовите метод `execute()` - статус должен стать `in_progress`
6. Создайте экспертизу с вердиктом для одного сотрудника
7. Проверьте, что статус стал `partially_executed`
8. Создайте экспертизы для всех остальных сотрудников
9. Проверьте, что статус стал `executed`
