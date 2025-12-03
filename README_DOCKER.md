# 🐳 Запуск проекта в Docker

## Быстрый старт

```bash
# 1. Сборка и запуск всех сервисов
docker-compose up --build

# 2. Откройте в браузере
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000/api
```

## Что происходит при запуске

1. ✅ Создается PostgreSQL база данных
2. ✅ Автоматически создаются миграции (`makemigrations`)
3. ✅ Применяются миграции (`migrate`)
4. ✅ Запускается Django backend на порту 8000
5. ✅ Запускается Next.js frontend на порту 3000

## Полезные команды

```bash
# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down

# Остановка с очисткой БД
docker-compose down -v

# Выполнение команд в backend
docker-compose exec backend python manage.py createsuperuser
docker-compose exec backend python manage.py shell
```

Подробная документация: [DOCKER_SETUP.md](./DOCKER_SETUP.md)

