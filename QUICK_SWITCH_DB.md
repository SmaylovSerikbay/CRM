# Быстрое переключение между БД

## Текущее состояние
✅ **Подключено к продакшн БД** (82.115.48.40:5432)

## Как переключиться на локальную БД

### 1. Откройте `.env.dev`

### 2. Измените настройки БД:

**Закомментируйте продакшн:**
```env
# Вариант 2: Продакшн БД (ОСТОРОЖНО! Реальные данные)
# POSTGRES_DB=postgres
# POSTGRES_USER=admin
# POSTGRES_PASSWORD=P0sTgReS9007
# POSTGRES_HOST=82.115.48.40
# POSTGRES_PORT=5432
```

**Раскомментируйте локальную:**
```env
# Вариант 1: Локальная БД для разработки (безопасно)
POSTGRES_DB=crm_db_dev
POSTGRES_USER=admin
POSTGRES_PASSWORD=Postgres9007
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
```

### 3. Перезапустите backend

```bash
docker-compose -f docker-compose.dev.yml restart backend
```

## Как вернуться на продакшн БД

Сделайте обратное - раскомментируйте продакшн, закомментируйте локальную, перезапустите backend.

## Проверка подключения

```bash
# Проверить, к какой БД подключены
docker-compose -f docker-compose.dev.yml exec backend python manage.py shell -c "from django.conf import settings; print(f'БД: {settings.DATABASES[\"default\"][\"HOST\"]}:{settings.DATABASES[\"default\"][\"PORT\"]}/{settings.DATABASES[\"default\"][\"NAME\"]}')"

# Проверить данные
docker-compose -f docker-compose.dev.yml exec backend python manage.py shell -c "from api.models import User, Contract; print(f'Users: {User.objects.count()}, Contracts: {Contract.objects.count()}')"
```

## Статистика

### Продакшн БД (82.115.48.40):
- Users: 5
- Contracts: 15
- Employees: 3
- Calendar Plans: 5

### Локальная БД (postgres):
- Пустая (или тестовые данные)
