# 🪟 Руководство для Windows

## ⚠️ Важно для пользователей Windows

Makefile может не работать на Windows без дополнительной установки. Используйте команды Docker Compose напрямую.

## 🚀 Быстрый старт

### Development режим

```powershell
# Запуск
docker-compose -f docker-compose.dev.yml up --build

# Остановка (Ctrl+C, затем)
docker-compose -f docker-compose.dev.yml down

# Просмотр логов
docker-compose -f docker-compose.dev.yml logs -f
```

**Доступ:**
- Frontend: http://localhost:3001
- Backend: http://localhost:8001/api
- PostgreSQL: localhost:5433

### Production режим

```powershell
# Запуск
docker-compose up --build

# Остановка (Ctrl+C, затем)
docker-compose down

# Просмотр логов
docker-compose logs -f
```

**Доступ:**
- Frontend: http://localhost:3000
- Backend: http://localhost:8000/api
- PostgreSQL: localhost:5432

## 📋 Основные команды

### Запуск и остановка

```powershell
# Development
docker-compose -f docker-compose.dev.yml up -d          # Запуск в фоне
docker-compose -f docker-compose.dev.yml down           # Остановка
docker-compose -f docker-compose.dev.yml restart        # Перезапуск

# Production
docker-compose up -d                                    # Запуск в фоне
docker-compose down                                     # Остановка
docker-compose restart                                  # Перезапуск
```

### Просмотр логов

```powershell
# Все сервисы
docker-compose logs -f

# Только backend
docker-compose logs -f backend

# Только frontend
docker-compose logs -f frontend

# Только база данных
docker-compose logs -f db
```

### Работа с контейнерами

```powershell
# Статус контейнеров
docker-compose ps

# Войти в backend контейнер
docker-compose exec backend sh

# Войти в frontend контейнер
docker-compose exec frontend sh

# Выполнить команду в backend
docker-compose exec backend python manage.py migrate
```

## 🔧 Утилиты

### Миграции Django

```powershell
# Создать миграции
docker-compose exec backend python manage.py makemigrations

# Применить миграции
docker-compose exec backend python manage.py migrate
```

### Создание суперпользователя

```powershell
docker-compose exec backend python manage.py createsuperuser
```

### Django shell

```powershell
docker-compose exec backend python manage.py shell
```

### Очистка

```powershell
# Остановить и удалить контейнеры
docker-compose down

# Остановить и удалить контейнеры + volumes (БД будет очищена!)
docker-compose down -v

# Удалить все неиспользуемые образы
docker image prune -a
```

## 🔄 Пересборка

```powershell
# Пересобрать все сервисы
docker-compose build --no-cache

# Пересобрать только backend
docker-compose build --no-cache backend

# Пересобрать только frontend
docker-compose build --no-cache frontend

# Пересобрать и запустить
docker-compose up --build
```

## 📝 Создание .env файлов

### Backend

```powershell
# Скопировать пример
copy backend\.env.example backend\.env

# Отредактировать в блокноте
notepad backend\.env
```

### Frontend

```powershell
# Скопировать пример
copy frontend\.env.example frontend\.env

# Отредактировать в блокноте
notepad frontend\.env
```

## 🛠️ Установка Make для Windows (опционально)

Если хотите использовать Makefile команды:

### Вариант 1: Chocolatey

```powershell
# Установить Chocolatey (если еще не установлен)
# https://chocolatey.org/install

# Установить Make
choco install make
```

### Вариант 2: Scoop

```powershell
# Установить Scoop (если еще не установлен)
# https://scoop.sh/

# Установить Make
scoop install make
```

### Вариант 3: Git Bash

Используйте Git Bash (поставляется с Git for Windows):
```bash
make dev
make prod
make help
```

## 📊 Сравнение команд

| Действие | Makefile | Windows PowerShell |
|----------|----------|-------------------|
| Запуск dev | `make dev` | `docker-compose -f docker-compose.dev.yml up --build` |
| Запуск prod | `make prod` | `docker-compose up --build` |
| Остановка dev | `make down-dev` | `docker-compose -f docker-compose.dev.yml down` |
| Остановка prod | `make down-prod` | `docker-compose down` |
| Логи dev | `make logs-dev` | `docker-compose -f docker-compose.dev.yml logs -f` |
| Логи prod | `make logs-prod` | `docker-compose logs -f` |
| Миграции | `make migrate` | `docker-compose exec backend python manage.py migrate` |
| Суперпользователь | `make createsuperuser` | `docker-compose exec backend python manage.py createsuperuser` |
| Очистка | `make clean` | `docker-compose down -v` |

## 🎯 Рекомендуемый workflow для Windows

### Первый запуск

```powershell
# 1. Клонировать репозиторий
git clone <repo-url>
cd CRM

# 2. Создать .env файлы (опционально)
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env

# 3. Запустить в dev режиме
docker-compose -f docker-compose.dev.yml up --build

# 4. В новом окне PowerShell создать суперпользователя
docker-compose exec backend python manage.py createsuperuser
```

### Ежедневная работа

```powershell
# Запуск
docker-compose -f docker-compose.dev.yml up

# Остановка (Ctrl+C)
# Затем
docker-compose -f docker-compose.dev.yml down
```

### Применение изменений

```powershell
# Если изменили код backend
docker-compose restart backend

# Если изменили код frontend
docker-compose restart frontend

# Если изменили зависимости или Dockerfile
docker-compose up --build
```

## ❓ Частые проблемы

### Порты заняты

```powershell
# Проверить какой процесс использует порт
netstat -ano | findstr :3000
netstat -ano | findstr :8000
netstat -ano | findstr :5432

# Убить процесс по PID
taskkill /PID <PID> /F

# Или использовать dev режим (другие порты)
docker-compose -f docker-compose.dev.yml up
```

### Docker не запускается

1. Убедитесь что Docker Desktop запущен
2. Проверьте что WSL2 установлен (для Windows 10/11)
3. Перезапустите Docker Desktop

### Ошибки при сборке

```powershell
# Очистить кэш Docker
docker system prune -a

# Пересобрать без кэша
docker-compose build --no-cache
```

### База данных не запускается

```powershell
# Проверить логи
docker-compose logs db

# Удалить volume и пересоздать
docker-compose down -v
docker-compose up
```

## 📚 Дополнительная информация

- [README.md](./README.md) - Главная документация
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Руководство по миграции
- [docs/DOCKER_SETUP.md](./docs/DOCKER_SETUP.md) - Docker инструкции
- [CHECKLIST.md](./CHECKLIST.md) - Чеклист проверки

## 💡 Советы

1. **Используйте PowerShell или CMD** - они работают лучше с Docker на Windows
2. **Запускайте Docker Desktop** перед работой с проектом
3. **Используйте WSL2** для лучшей производительности
4. **Создайте bat файлы** для часто используемых команд
5. **Используйте Git Bash** если хотите использовать Makefile

## 📝 Создание bat файлов (опционально)

Создайте файлы для быстрого запуска:

### dev-start.bat
```batch
@echo off
docker-compose -f docker-compose.dev.yml up --build
```

### dev-stop.bat
```batch
@echo off
docker-compose -f docker-compose.dev.yml down
```

### prod-start.bat
```batch
@echo off
docker-compose up --build
```

### prod-stop.bat
```batch
@echo off
docker-compose down
```

Затем просто запускайте двойным кликом!

---

**Теперь вы можете работать с проектом на Windows! 🚀**
