# Быстрое исправление CORS ошибок

## Проблема
```
Access to fetch at 'https://crm.archeo.kz/api/...' from origin 'http://localhost:3000' 
has been blocked by CORS policy
```

## Решение (выберите один)

### ✅ Вариант 1: Development окружение (рекомендуется)

```bash
# Остановить production
docker-compose down

# Запустить development
docker-compose -f docker-compose.dev.yml up -d

# Открыть: http://localhost:3001 (не 3000!)
```

### ✅ Вариант 2: Пересобрать production для локальной работы

Если используете production контейнеры локально:

1. Убедитесь, что в `.env.prod`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

2. Пересоберите frontend:
```bash
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d
```

### ⚠️ Вариант 3: Если работаете с реальным production сервером

Добавьте на production сервере в `backend/crm_backend/settings.py`:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Добавьте эту строку
    "http://127.0.0.1:3000",  # И эту
    "https://crm.archeo.kz",
]
```

Затем перезапустите backend на сервере.

## Проверка

1. Откройте браузер: http://localhost:3000 (или 3001 для dev)
2. Откройте консоль (F12)
3. Не должно быть CORS ошибок

## Порты

- **Production**: Frontend 3000, Backend 8000
- **Development**: Frontend 3001, Backend 8001

