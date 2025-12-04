# Исправление ошибки деплоя на продакшене

## Проблема
```
failed to compute cache key: "/app/public": not found
```

## Решение
Создана папка `frontend/public/` которая требуется для Next.js standalone сборки.

## Шаги для деплоя на сервере

### 1. Закоммитьте изменения локально
```bash
git add frontend/public/.gitkeep
git add .env.prod
git add backend/crm_backend/settings.py
git add docs/
git commit -m "fix: добавлена папка public и исправлены CORS настройки для продакшена"
git push origin main
```

### 2. На сервере обновите код
```bash
cd ~/projects/CRM
git pull origin main
```

### 3. Пересоберите контейнеры
```bash
# Остановите старые контейнеры
docker-compose down

# Очистите старые образы (опционально)
docker system prune -f

# Пересоберите с нуля
docker-compose build --no-cache

# Запустите
docker-compose up -d
```

### 4. Проверьте логи
```bash
# Проверьте что контейнеры запустились
docker-compose ps

# Проверьте логи бэкенда
docker-compose logs -f backend

# Проверьте логи фронтенда
docker-compose logs -f frontend
```

### 5. Проверьте работу
- Откройте https://crm.archeo.kz
- Попробуйте авторизоваться
- Проверьте что нет ошибок CORS в консоли браузера

## Что было исправлено

### Frontend
- ✅ Создана папка `frontend/public/`
- ✅ Dockerfile.prod теперь может скопировать эту папку

### Backend
- ✅ Добавлен домен `https://crm.archeo.kz` в CORS_ALLOWED_ORIGINS
- ✅ Добавлены необходимые CORS заголовки

### Environment
- ✅ `.env.prod`: DEBUG=False (безопасность)
- ✅ `.env.prod`: Исправлен домен (убрана опечатка .kz.kz)
- ✅ `.env.prod`: NEXT_PUBLIC_API_URL указывает на продакшн домен

## Troubleshooting

### Если контейнеры не запускаются
```bash
# Проверьте логи
docker-compose logs

# Проверьте что сеть database_network существует
docker network ls | grep database_network

# Если нет, создайте
docker network create database_network
```

### Если всё равно ошибка с public
```bash
# На сервере создайте папку вручную
mkdir -p frontend/public
echo "# Static files" > frontend/public/.gitkeep

# Пересоберите
docker-compose build --no-cache frontend
docker-compose up -d
```

### Если ошибки CORS
Проверьте что nginx правильно проксирует запросы (см. docs/PRODUCTION_CORS_SETUP.md)
