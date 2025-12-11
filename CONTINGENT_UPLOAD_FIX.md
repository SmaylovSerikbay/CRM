# Исправление загрузки контингента для клиник

## Проблема
Клиники не могли загружать Excel файлы с контингентом, в то время как работодатели могли это делать без проблем.

## Причина
В backend API (`backend/api/views.py`) в функции `upload_excel` была жесткая проверка статуса договора:

```python
if contract.status != 'approved':
    return Response({'error': 'Договор должен быть подтвержден перед загрузкой контингента'}, status=status.HTTP_400_BAD_REQUEST)
```

Эта проверка требовала, чтобы договор был в статусе `approved` (подтвержден), но для клиник должна быть возможность загружать контингент на разных этапах работы с договором.

## Решение
Изменена логика проверки статуса договора в зависимости от роли пользователя:

### Для работодателей (как было):
- Требуется статус `approved` (подтвержденный договор)

### Для клиник (исправлено):
- Разрешены статусы: `approved`, `active`, `in_progress`, `sent`, `pending_approval`
- Это позволяет клиникам загружать контингент на всех активных этапах работы с договором

## Изменения в коде

### 1. Проверка статуса при указанном contract_id:
```python
# Проверяем статус договора в зависимости от роли пользователя
if user.role == 'employer':
    # Для работодателей требуется подтвержденный договор
    if contract.status != 'approved':
        return Response({'error': 'Договор должен быть подтвержден перед загрузкой контингента'}, status=status.HTTP_400_BAD_REQUEST)
elif user.role == 'clinic':
    # Для клиник разрешаем загрузку для активных договоров
    allowed_statuses = ['approved', 'active', 'in_progress', 'sent', 'pending_approval']
    if contract.status not in allowed_statuses:
        return Response({'error': f'Загрузка контингента недоступна для договора со статусом "{contract.status}". Разрешенные статусы: {", ".join(allowed_statuses)}'}, status=status.HTTP_400_BAD_REQUEST)
```

### 2. Поиск договора при неуказанном contract_id:
```python
elif user.role == 'clinic':
    # Для клиник ищем договоры с разрешенными статусами
    allowed_statuses = ['approved', 'active', 'in_progress', 'sent', 'pending_approval']
    contracts = Contract.objects.filter(clinic=user, status__in=allowed_statuses).first()
    if contracts:
        contract = contracts
    else:
        return Response({'error': f'Необходимо выбрать активный договор для загрузки контингента. Разрешенные статусы: {", ".join(allowed_statuses)}'}, status=status.HTTP_400_BAD_REQUEST)
```

## Результат
Теперь клиники могут загружать Excel файлы с контингентом для договоров в следующих статусах:
- `approved` - Согласован
- `active` - Действует  
- `in_progress` - В процессе исполнения
- `sent` - Отправлен
- `pending_approval` - Ожидает согласования

## Тестирование
1. Перезапустите backend: `docker-compose -f docker-compose.blue-green.yml restart backend-blue`
2. Попробуйте загрузить Excel файл с контингентом от имени клиники
3. Убедитесь, что загрузка работает для договоров с разрешенными статусами

## Дата исправления
11 декабря 2025 г.