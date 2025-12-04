# Blue-Green Deployment с Nginx Proxy Manager

## Обзор

Zero-downtime deployment стратегия для production окружения с использованием существующего Nginx Proxy Manager.

## Архитектура

### Порты окружений

**Blue (текущая версия):**
- Backend: `localhost:8001`
- Frontend: `localhost:3001`

**Green (новая версия):**
- Backend: `localhost:8002`
- Frontend: `localhost:3002`

### Принцип работы

1. **Blue** окружение работает и обслуживает пользователей
2. **Green** окружение деплоится параллельно
3. После проверки Green, трафик переключается в Nginx Proxy Manager
4. Blue остается для быстрого отката
5. После подтверждения, Blue останавливается

## Первоначальная настройка

### 1. Настройка Nginx Proxy Manager

Создайте два Proxy Host в Nginx Proxy Manager:

#### Backend API Proxy Host
```
Domain Names: crm.archeo.kz
Scheme: http
Forward Hostname/IP: localhost
Forward Port: 8001  (начинаем с Blue)
Cache Assets: Yes
Block Common Exploits: Yes
Websockets Support: Yes

Location: /api
Forward Hostname/IP: localhost
Forward Port: 8001
```

#### Frontend Proxy Host
```
Domain Names: crm.archeo.kz
Scheme: http
Forward Hostname/IP: localhost
Forward Port: 3001  (начинаем с Blue)
Cache Assets: Yes
Block Common Exploits: Yes
Websockets Support: Yes
```

### 2. SSL сертификаты

В Nginx Proxy Manager настройте SSL для обоих Proxy Hosts:
- Force SSL: Yes
- HTTP/2 Support: Yes
- HSTS Enabled: Yes

### 3. Запуск Blue окружения

```bash
# Запустить Blue окружение
docker compose -f docker-compose.blue-green.yml up -d

# Проверить статус
./deploy-blue-green.sh status
```

## Процесс деплоя

### Автоматический деплой (рекомендуется)

```bash
# Автоматический полный деплой
./deploy-blue-green.sh auto
```

Скрипт выполнит все шаги автоматически:
0. **Git pull** - получит последние изменения из репозитория
1. **Деплой** - соберет и запустит новую версию
2. **Переключение** - покажет инструкцию для NPM
3. **Проверка** - попросит подтвердить работу сайта
4. **Очистка** - остановит старое окружение

### Шаг 1: Деплой новой версии (ручной режим)

```bash
# Деплой в Green окружение (если Blue активен)
./deploy-blue-green.sh deploy
```

Скрипт выполнит:
- Определит неактивное окружение (Green)
- Соберет новые образы без кэша
- Запустит контейнеры
- Проверит health checks
- Дождется готовности сервисов

### Шаг 2: Тестирование новой версии

Пока Green деплоится, Blue продолжает работать. После деплоя:

```bash
# Проверить Green напрямую
curl http://localhost:8002/api/health/
curl http://localhost:3002/

# Или в браузере
http://localhost:8002/api/
http://localhost:3002/
```

### Шаг 3: Переключение трафика

```bash
./deploy-blue-green.sh switch
```

Скрипт покажет инструкцию:

```
=== ИНСТРУКЦИЯ ПО ПЕРЕКЛЮЧЕНИЮ В NGINX PROXY MANAGER ===

1. Backend API:
   Откройте Proxy Host для: crm.archeo.kz/api
   Измените Forward Port на: 8002

2. Frontend:
   Откройте Proxy Host для: crm.archeo.kz
   Измените Forward Port на: 3002
```

**В Nginx Proxy Manager:**
1. Откройте Backend Proxy Host
2. Edit → Forward Port: `8002`
3. Save
4. Откройте Frontend Proxy Host
5. Edit → Forward Port: `3002`
6. Save

**Проверьте работу сайта!**

### Шаг 4: Подтверждение или откат

#### Если все работает:
```bash
# Подтвердите переключение
./deploy-blue-green.sh switch
# Ответьте 'y' на вопрос

# Остановите старое окружение
./deploy-blue-green.sh cleanup
```

#### Если есть проблемы:
```bash
# Откат к предыдущей версии
./deploy-blue-green.sh rollback
```

Скрипт покажет инструкцию для отката портов в NPM обратно на Blue (8001/3001).

## Команды

### deploy
Деплой новой версии в неактивное окружение
```bash
./deploy-blue-green.sh deploy
```

### switch
Переключение трафика (с инструкцией для NPM)
```bash
./deploy-blue-green.sh switch
```

### rollback
Откат к предыдущей версии
```bash
./deploy-blue-green.sh rollback
```

### cleanup
Остановка неактивного окружения
```bash
./deploy-blue-green.sh cleanup
```

### status
Показать статус всех окружений
```bash
./deploy-blue-green.sh status
```

## Makefile команды

Добавлены команды для удобства:

```bash
# Деплой и переключение
make deploy-blue-green
make switch-blue-green
make rollback-blue-green
make status-blue-green
```

## Health Checks

Каждый сервис имеет health check:

**Backend:**
- Endpoint: `http://localhost:8000/api/health/`
- Interval: 10s
- Timeout: 5s
- Retries: 3
- Start period: 40s

**Frontend:**
- Endpoint: `http://localhost:3000/`
- Interval: 10s
- Timeout: 5s
- Retries: 3
- Start period: 40s

## Мониторинг

### Проверка статуса
```bash
# Статус всех контейнеров
docker compose -f docker-compose.blue-green.yml ps

# Логи Blue
docker compose -f docker-compose.blue-green.yml logs -f backend-blue frontend-blue

# Логи Green
docker compose -f docker-compose.blue-green.yml --profile green logs -f backend-green frontend-green

# Health status
docker inspect backend-blue --format='{{.State.Health.Status}}'
docker inspect frontend-blue --format='{{.State.Health.Status}}'
```

### Метрики
```bash
# Использование ресурсов
docker stats backend-blue frontend-blue backend-green frontend-green
```

## Troubleshooting

### Проблема: Health check не проходит

```bash
# Проверить логи
docker compose -f docker-compose.blue-green.yml logs backend-green

# Проверить вручную
docker exec backend-green curl -f http://localhost:8000/api/health/
```

### Проблема: Миграции не применились

```bash
# Применить миграции вручную
docker compose -f docker-compose.blue-green.yml exec backend-green python manage.py migrate
```

### Проблема: Порт занят

```bash
# Проверить занятые порты
netstat -tulpn | grep -E '8001|8002|3001|3002'

# Остановить конфликтующие контейнеры
docker compose -f docker-compose.yml down
```

### Проблема: Оба окружения запущены, много ресурсов

```bash
# Остановить неактивное окружение
./deploy-blue-green.sh cleanup
```

## Best Practices

1. **Всегда тестируйте Green перед переключением**
   - Проверьте health endpoints
   - Протестируйте основной функционал
   - Проверьте логи на ошибки

2. **Не удаляйте старое окружение сразу**
   - Держите Blue запущенным минимум 10-15 минут после переключения
   - Мониторьте метрики и логи

3. **Используйте миграции осторожно**
   - Миграции должны быть обратно совместимы
   - Не удаляйте колонки сразу
   - Используйте двухэтапный подход для breaking changes

4. **Мониторинг после деплоя**
   - Проверьте error rate
   - Проверьте response time
   - Проверьте логи на ошибки

5. **Документируйте изменения**
   - Записывайте время деплоя
   - Фиксируйте версии
   - Отмечайте проблемы

## Автоматизация

Для полной автоматизации можно использовать CI/CD:

```yaml
# .github/workflows/deploy.yml
name: Blue-Green Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Green
        run: ./deploy-blue-green.sh deploy
      
      - name: Run tests
        run: ./test-green.sh
      
      - name: Switch traffic
        run: ./deploy-blue-green.sh switch
      
      - name: Monitor
        run: ./monitor.sh
      
      - name: Cleanup
        run: ./deploy-blue-green.sh cleanup
```

## Откат в экстренной ситуации

Если что-то пошло не так и нужен быстрый откат:

```bash
# 1. Быстрый откат через NPM
# Откройте Nginx Proxy Manager
# Измените порты обратно на Blue (8001/3001)

# 2. Или через скрипт
./deploy-blue-green.sh rollback

# 3. Проверьте работу
curl https://crm.archeo.kz/api/health/

# 4. Остановите проблемное окружение
docker compose -f docker-compose.blue-green.yml --profile green down
```

## Заключение

Blue-Green deployment обеспечивает:
- ✅ Zero downtime при деплое
- ✅ Быстрый откат при проблемах
- ✅ Возможность тестирования перед переключением
- ✅ Минимальный риск для пользователей
- ✅ Совместимость с Nginx Proxy Manager
