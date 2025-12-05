# ⚡ Быстрый старт

## 🚀 Development (для разработки)

### 1. Запустить проект

```bash
make dev
```

Или без Make:
```bash
docker-compose -f docker-compose.dev.yml up --build
```

### 2. Открыть в браузере

- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:8001/api

### 3. Создать администратора для admin панели (опционально)

```bash
make create-admin
```

Или без Make:
```bash
docker-compose exec backend python manage.py create_admin_user +77001234567
```

### 4. Войти в admin панель

- **Admin панель:** http://localhost:8001/admin/
- Введите номер телефона
- Получите OTP код в WhatsApp
- Введите код и войдите

> **📖 Подробнее:** [ADMIN_QUICK_START.md](./ADMIN_QUICK_START.md)

**Готово! 🎉** Проект запущен в dev режиме.

---

## 🏭 Production (для продакшена)

### ⚠️ ВАЖНО: Перед первым запуском!

**1. Отредактируйте `.env.prod` файл:**

```bash
# Windows
notepad .env.prod

# Linux/Mac
nano .env.prod
```

**2. Измените следующие параметры:**

```env
# Установите надежный пароль БД
POSTGRES_PASSWORD=ваш_надежный_пароль_здесь

# Сгенерируйте новый секретный ключ
SECRET_KEY=ваш_секретный_ключ_здесь

# Укажите ваш домен
ALLOWED_HOSTS=localhost,127.0.0.1,ваш-домен.com

# Укажите URL вашего API
NEXT_PUBLIC_API_URL=https://ваш-домен.com/api
```

**Генерация SECRET_KEY:**
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### 3. Запустить проект

```bash
make prod
```

Или без Make:
```bash
docker-compose up --build
```

### 4. Открыть в браузере

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000/api

### 5. Создать администратора

```bash
make create-admin
```

Или без Make:
```bash
docker-compose exec backend python manage.py create_admin_user +77001234567
```

### 6. Войти в admin панель

- **Admin панель:** http://localhost:8000/admin/
- Используйте OTP авторизацию через WhatsApp

**Готово! 🎉** Проект запущен в production режиме.

---

## 📋 Полезные команды

### Просмотр логов

```bash
# Development
make logs-dev

# Production
make logs-prod
```

### Остановка

```bash
# Development
make down-dev

# Production
make down-prod
```

### Перезапуск

```bash
# Development
make restart-dev

# Production
make restart-prod
```

### Применить миграции

```bash
make migrate
```

### Очистить все (удалить контейнеры и данные)

```bash
make clean
```

---

## ❓ Проблемы?

### Порты заняты

Используйте dev режим (другие порты):
```bash
make dev
```

### Docker не запускается

1. Убедитесь что Docker Desktop запущен
2. Перезапустите Docker Desktop

### Ошибки при сборке

```bash
# Очистить и пересобрать
make clean
make dev  # или make prod
```

---

## 📚 Дополнительная документация

- [README.md](./README.md) - Полная документация
- [ENV_SETUP.md](./ENV_SETUP.md) - Настройка переменных окружения
- [WINDOWS_GUIDE.md](./WINDOWS_GUIDE.md) - Для Windows пользователей
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Миграция со старой версии

---

**Нужна помощь?** Смотрите полную документацию в [README.md](./README.md)
