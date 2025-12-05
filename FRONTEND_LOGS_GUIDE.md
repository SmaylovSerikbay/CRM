# Руководство по логам фронтенда на проде

## Проблема
На проде не отображались логи фронтенда из-за:
1. Standalone режим Next.js минимизирует логи
2. NODE_ENV=production отключает детальное логирование
3. Не было настроек логирования в docker-compose

## Решение

### Изменения в конфигурации:

1. **frontend/Dockerfile.prod** - добавлен `NODE_OPTIONS=--enable-source-maps`
2. **docker-compose.yml** - добавлены настройки логирования
3. **frontend/next.config.js** - включено логирование fetch запросов

### Как проверить логи:

#### Вариант 1: Локально через скрипт
```bash
check-frontend-logs.bat
```

#### Вариант 2: На сервере напрямую
```bash
ssh root@89.169.44.237
cd /root/CRM
docker-compose logs -f frontend
```

#### Вариант 3: Последние 100 строк
```bash
ssh root@89.169.44.237 "cd /root/CRM && docker-compose logs --tail=100 frontend"
```

#### Вариант 4: С фильтрацией по времени
```bash
ssh root@89.169.44.237 "cd /root/CRM && docker-compose logs --since 30m frontend"
```

### После деплоя:

1. Пересобрать фронтенд:
```bash
ssh root@89.169.44.237 "cd /root/CRM && docker-compose up -d --build frontend"
```

2. Проверить логи:
```bash
check-frontend-logs.bat
```

### Что теперь будет в логах:

- ✅ Запуск сервера Next.js
- ✅ Входящие HTTP запросы
- ✅ Fetch запросы к API (с полными URL)
- ✅ Ошибки рендеринга
- ✅ Source maps для отладки
- ✅ Ротация логов (макс 10MB, 3 файла)

### Полезные команды:

```bash
# Все логи (backend + frontend)
docker-compose logs -f

# Только ошибки фронтенда
docker-compose logs frontend | grep -i error

# Статус контейнера
docker-compose ps frontend

# Перезапуск фронтенда
docker-compose restart frontend
```

## Настройки логирования

В `docker-compose.yml` добавлено:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"    # Максимальный размер файла лога
    max-file: "3"      # Количество файлов для ротации
```

Это предотвращает переполнение диска логами.
