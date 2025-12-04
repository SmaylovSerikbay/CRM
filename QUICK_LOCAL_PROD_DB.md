# Быстрый старт: Локальная разработка с продакшн БД

## ✅ Готово к использованию!

Вы успешно подключились к продакшн базе данных.

### Текущие данные в БД:
- **Пользователей:** 5
- **Договоров:** 15
- **Сотрудников:** 3
- **Календарных планов:** 5

## Быстрые команды

### Запуск
```bash
# Остановить локальную БД
docker-compose -f docker-compose.dev.yml down

# Запустить с продакшн БД
docker-compose -f docker-compose.local.yml up -d
```

### Доступ
- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:8001/api
- **Admin:** http://localhost:8001/admin

### Просмотр логов
```bash
# Все логи
docker-compose -f docker-compose.local.yml logs -f

# Только backend
docker-compose -f docker-compose.local.yml logs -f backend
```

### Остановка
```bash
docker-compose -f docker-compose.local.yml down
```

### Вернуться к локальной БД
```bash
docker-compose -f docker-compose.local.yml down
docker-compose -f docker-compose.dev.yml up -d
```

## Проверка данных

```bash
# Статистика БД
docker-compose -f docker-compose.local.yml exec backend python manage.py shell -c "
from api.models import User, Contract, ContingentEmployee, CalendarPlan
print(f'Users: {User.objects.count()}')
print(f'Contracts: {Contract.objects.count()}')
print(f'Employees: {ContingentEmployee.objects.count()}')
print(f'Calendar Plans: {CalendarPlan.objects.count()}')
"

# Список пользователей
docker-compose -f docker-compose.local.yml exec backend python manage.py shell -c "
from api.models import User
for u in User.objects.all():
    print(f'{u.id}: {u.phone} - {u.role}')
"

# Список договоров
docker-compose -f docker-compose.local.yml exec backend python manage.py shell -c "
from api.models import Contract
for c in Contract.objects.all()[:5]:
    print(f'{c.id}: {c.contract_number} - {c.status}')
"
```

## ⚠️ Важно помнить

1. **Это продакшн данные** - будьте осторожны!
2. **Не запускайте миграции** без проверки
3. **Не удаляйте данные** без необходимости
4. **Тестируйте аккуратно** - изменения сразу попадают в прод

## Полезные ссылки

- Полная документация: [LOCAL_DEV_WITH_PROD_DB.md](LOCAL_DEV_WITH_PROD_DB.md)
- Настройки: [.env.local](.env.local)
- Docker Compose: [docker-compose.local.yml](docker-compose.local.yml)

## Текущая конфигурация

```
БД: 82.115.48.40:5432
База: postgres
Пользователь: admin
Режим: Прямое подключение
```

Всё работает! Можете начинать разработку с реальными данными из прода.
