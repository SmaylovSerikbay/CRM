# Инструкция по запуску проекта в Docker

## Требования
- Docker Desktop установлен и запущен
- Docker Compose установлен

## Быстрый старт

### 1. Сборка и запуск всех сервисов

```bash
docker-compose up --build
```

Эта команда:
- Соберет все Docker образы
- Создаст и запустит PostgreSQL базу данных
- Автоматически создаст миграции (`makemigrations`)
- Применит миграции (`migrate`)
- Запустит backend на порту 8000
- Запустит frontend на порту 3000

### 2. Доступ к приложению

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api
- **Django Admin**: http://localhost:8000/admin (если настроен)

### 3. Остановка сервисов

```bash
docker-compose down
```

### 4. Остановка с удалением volumes (очистка БД)

```bash
docker-compose down -v
```

## Полезные команды

### Просмотр логов

```bash
# Все сервисы
docker-compose logs -f

# Только backend
docker-compose logs -f backend

# Только frontend
docker-compose logs -f frontend

# Только база данных
docker-compose logs -f db
```

### Выполнение команд в контейнере

```bash
# Backend контейнер
docker-compose exec backend python manage.py createsuperuser
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py shell

# Frontend контейнер
docker-compose exec frontend npm install
docker-compose exec frontend npm run build
```

### Пересборка без кэша

```bash
docker-compose build --no-cache
docker-compose up
```

## Структура сервисов

### Backend (Django)
- **Порт**: 8000
- **База данных**: PostgreSQL (внутренний порт 5432)
- **Автоматические миграции**: Да (при каждом запуске)
- **Переменные окружения**: Настроены в `docker-compose.yml`

### Frontend (Next.js)
- **Порт**: 3000
- **API URL**: http://localhost:8000/api
- **Сборка**: Production mode

### Database (PostgreSQL)
- **Порт**: 5432 (внешний доступ)
- **База данных**: crm_db
- **Пользователь**: postgres
- **Пароль**: postgres
- **Volume**: postgres_data (данные сохраняются)

## Решение проблем

### Проблема: Порт уже занят

Если порты 3000, 8000 или 5432 заняты, измените их в `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Вместо 3000:3000
  - "8001:8000"  # Вместо 8000:8000
```

### Проблема: Миграции не применяются

Выполните вручную:

```bash
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
```

### Проблема: Frontend не подключается к Backend

Проверьте переменную окружения `NEXT_PUBLIC_API_URL` в `docker-compose.yml`. 
Для браузера она должна быть `http://localhost:8000/api`, а не `http://backend:8000/api`.

### Проблема: База данных не запускается

Проверьте логи:

```bash
docker-compose logs db
```

Убедитесь, что PostgreSQL контейнер здоров:

```bash
docker-compose ps
```

## Обновление кода

После изменения кода:

1. **Backend**: Перезапустите контейнер
   ```bash
   docker-compose restart backend
   ```

2. **Frontend**: Пересоберите и перезапустите
   ```bash
   docker-compose up --build frontend
   ```

## Production настройки

Для production измените в `docker-compose.yml`:

1. **SECRET_KEY**: Используйте безопасный ключ
2. **DEBUG**: Установите в `False`
3. **Пароли БД**: Измените на безопасные
4. **Volumes**: Настройте правильные пути для production

## Мониторинг

Проверка статуса всех контейнеров:

```bash
docker-compose ps
```

Проверка использования ресурсов:

```bash
docker stats
```

