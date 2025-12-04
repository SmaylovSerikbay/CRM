# Локальная разработка с продакшн базой данных

## ⚠️ ВАЖНО: Безопасность

Этот режим подключает вашу локальную разработку к **ПРОДАКШН базе данных**. 

**Будьте осторожны:**
- Все изменения в БД будут применены к продакшн данным
- Не запускайте миграции без проверки
- Не удаляйте данные
- Используйте только для чтения или тестирования с реальными данными

## Простое решение

Используем существующий `.env.dev` - просто переключаем настройки БД в нём.

## Варианты подключения

### Вариант 1: Прямое подключение (текущий)

База данных доступна напрямую по IP: `82.115.48.40:5432`

**Преимущества:**
- Простая настройка
- Не требует SSH

**Недостатки:**
- Менее безопасно (БД открыта в интернет)
- Зависит от настроек firewall

### Вариант 2: Через SSH туннель (рекомендуется)

Более безопасный способ - создать SSH туннель к серверу.

**Преимущества:**
- Безопасное подключение через SSH
- БД не нужно открывать в интернет

**Недостатки:**
- Требует SSH доступ к серверу
- Нужно держать туннель открытым

## Быстрый старт (Вариант 1 - Прямое подключение)

### 1. Проверьте файл `.env.local`

Файл уже создан с настройками:

```env
POSTGRES_DB=postgres
POSTGRES_USER=admin
POSTGRES_PASSWORD=P0sTgReS9007
POSTGRES_HOST=82.115.48.40
POSTGRES_PORT=5432
```

### 2. Проверьте доступность БД

```bash
# Проверка подключения к БД
docker run --rm postgres:15 psql -h 82.115.48.40 -U admin -d postgres -c "SELECT version();"
```

Введите пароль: `P0sTgReS9007`

Если команда выполнилась успешно - БД доступна!

### 3. Запустите локальную разработку

```bash
# Остановите текущие контейнеры (если запущены)
docker-compose -f docker-compose.dev.yml down

# Запустите с продакшн БД
docker-compose -f docker-compose.local.yml up -d

# Просмотр логов
docker-compose -f docker-compose.local.yml logs -f
```

### 4. Проверьте подключение

Откройте браузер:
- Frontend: http://localhost:3001
- Backend API: http://localhost:8001/api

Вы должны увидеть реальные данные из продакшн БД!

## Настройка через SSH туннель (Вариант 2 - Рекомендуется)

### 1. Создайте SSH туннель

```bash
# Создайте туннель (замените user на ваш SSH пользователь)
ssh -L 5433:localhost:5432 user@82.115.48.40 -N

# Или с ключом
ssh -i ~/.ssh/your_key -L 5433:localhost:5432 user@82.115.48.40 -N
```

Туннель будет перенаправлять локальный порт 5433 на удаленный порт 5432.

### 2. Обновите `.env.local`

```env
# Измените настройки БД:
POSTGRES_HOST=host.docker.internal
POSTGRES_PORT=5433
```

### 3. Запустите разработку

```bash
docker-compose -f docker-compose.local.yml up -d
```

## Полезные команды

### Проверка данных в БД

```bash
# Количество пользователей
docker-compose -f docker-compose.local.yml exec backend python manage.py shell -c "from api.models import User; print(f'Users: {User.objects.count()}')"

# Количество договоров
docker-compose -f docker-compose.local.yml exec backend python manage.py shell -c "from api.models import Contract; print(f'Contracts: {Contract.objects.count()}')"

# Количество сотрудников
docker-compose -f docker-compose.local.yml exec backend python manage.py shell -c "from api.models import ContingentEmployee; print(f'Employees: {ContingentEmployee.objects.count()}')"

# Количество календарных планов
docker-compose -f docker-compose.local.yml exec backend python manage.py shell -c "from api.models import CalendarPlan; print(f'Plans: {CalendarPlan.objects.count()}')"
```

### Просмотр логов

```bash
# Все логи
docker-compose -f docker-compose.local.yml logs -f

# Только backend
docker-compose -f docker-compose.local.yml logs -f backend

# Только frontend
docker-compose -f docker-compose.local.yml logs -f frontend
```

### Остановка

```bash
# Остановить контейнеры
docker-compose -f docker-compose.local.yml down

# Остановить и удалить volumes (осторожно!)
docker-compose -f docker-compose.local.yml down -v
```

### Перезапуск

```bash
# Перезапустить backend
docker-compose -f docker-compose.local.yml restart backend

# Перезапустить frontend
docker-compose -f docker-compose.local.yml restart frontend
```

## Переключение между режимами

### Локальная БД (разработка)
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Продакшн БД (тестирование с реальными данными)
```bash
docker-compose -f docker-compose.local.yml up -d
```

### Продакшн (деплой)
```bash
docker-compose up -d
```

## Безопасность и лучшие практики

### ✅ Рекомендуется:
- Использовать SSH туннель вместо прямого подключения
- Работать в режиме только для чтения (если возможно)
- Делать бэкап БД перед тестированием
- Тестировать миграции на копии БД
- Использовать транзакции для тестовых операций

### ❌ Не рекомендуется:
- Запускать `makemigrations` на продакшн БД
- Удалять данные без подтверждения
- Изменять критичные данные (пользователи, договоры)
- Оставлять БД открытой в интернет без firewall

## Создание бэкапа продакшн БД

Перед работой с продакшн БД рекомендуется создать бэкап:

```bash
# На сервере
docker exec postgres pg_dump -U admin postgres > backup_$(date +%Y%m%d_%H%M%S).sql

# Или локально через SSH
ssh user@82.115.48.40 "docker exec postgres pg_dump -U admin postgres" > backup_$(date +%Y%m%d_%H%M%S).sql
```

## Восстановление из бэкапа

Если что-то пошло не так:

```bash
# На сервере
docker exec -i postgres psql -U admin postgres < backup_20241205_120000.sql

# Или локально через SSH
cat backup_20241205_120000.sql | ssh user@82.115.48.40 "docker exec -i postgres psql -U admin postgres"
```

## Troubleshooting

### Ошибка: "could not connect to server"

**Причина:** БД недоступна или firewall блокирует подключение

**Решение:**
1. Проверьте, что БД запущена на сервере
2. Проверьте firewall правила
3. Используйте SSH туннель

### Ошибка: "password authentication failed"

**Причина:** Неверный пароль в `.env.local`

**Решение:**
1. Проверьте пароль в `.env.local`
2. Сверьте с `.env.prod` на сервере

### Ошибка: "database does not exist"

**Причина:** Неверное имя БД

**Решение:**
1. Проверьте `POSTGRES_DB` в `.env.local`
2. Должно быть `postgres` (как в проде)

### Медленное подключение

**Причина:** Высокая задержка сети

**Решение:**
1. Используйте SSH туннель
2. Или работайте напрямую на сервере

## Дополнительная информация

### Порты

- **Backend (локальный):** http://localhost:8001
- **Frontend (локальный):** http://localhost:3001
- **PostgreSQL (прод):** 82.115.48.40:5432
- **PostgreSQL (через туннель):** localhost:5433

### Файлы конфигурации

- `.env.local` - переменные окружения для локальной разработки с прод БД
- `docker-compose.local.yml` - Docker Compose конфигурация
- `.env.dev` - переменные для разработки с локальной БД
- `.env.prod` - переменные для продакшн

### Сети

Контейнеры используют `host.docker.internal` для доступа к хост-машине (для SSH туннеля).

## Контакты и поддержка

Если возникли проблемы:
1. Проверьте логи: `docker-compose -f docker-compose.local.yml logs`
2. Проверьте подключение к БД
3. Проверьте настройки в `.env.local`
