# Исправление ошибок CORS для локальной разработки

## Проблема

При работе на `localhost:3000` возникают ошибки:
- `Access to fetch at 'https://crm.archeo.kz/api/...' from origin 'http://localhost:3000' has been blocked by CORS policy`
- `502 Bad Gateway`

## Причина

1. Запущены **production** контейнеры (`docker-compose.yml`)
2. Frontend скомпилирован с `NEXT_PUBLIC_API_URL=https://crm.archeo.kz/api`
3. Браузер пытается обратиться к production серверу с `localhost:3000`
4. Production сервер блокирует CORS запросы с localhost

## Решения

### Вариант 1: Использовать Development окружение (рекомендуется для локальной разработки)

```bash
# Остановить production контейнеры
docker-compose down

# Запустить development окружение
docker-compose -f docker-compose.dev.yml up -d

# Frontend будет доступен на: http://localhost:3001
# Backend будет доступен на: http://localhost:8001
```

Development окружение:
- Frontend: `http://localhost:3001` → Backend: `http://localhost:8001/api`
- Hot reload включен
- Автоматические миграции
- Отдельная БД для разработки

### Вариант 2: Настроить Production для локальной работы

Если нужно использовать production контейнеры локально:

1. **Создайте `.env.prod` файл** (если еще не создан):

```env
# Backend
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,crm.archeo.kz

# Database
POSTGRES_DB=crm_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Green API
GREEN_API_ID_INSTANCE=7105394320
GREEN_API_TOKEN=your-token
GREEN_API_URL=https://7105.api.green-api.com

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

2. **Пересоберите контейнеры**:

```bash
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d
```

### Вариант 3: Добавить localhost в CORS на production сервере

Если вы работаете с реальным production сервером, нужно добавить localhost в CORS на сервере.

⚠️ **ВНИМАНИЕ**: Это небезопасно для production! Используйте только для тестирования.

На production сервере в `backend/crm_backend/settings.py`:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://crm.archeo.kz",
    # ... другие домены
]
```

## Проверка

После настройки проверьте:

1. **Frontend доступен**: http://localhost:3000 или http://localhost:3001
2. **Backend доступен**: http://localhost:8000/api или http://localhost:8001/api
3. **Нет CORS ошибок** в консоли браузера

## Рекомендация

Для **локальной разработки** всегда используйте:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

Это дает:
- ✅ Правильные URL для локальной работы
- ✅ Hot reload для быстрой разработки
- ✅ Отдельную БД (не влияет на production)
- ✅ Автоматические миграции

