# Исправление проблемы с OTP авторизацией

## Проблема
При попытке отправить OTP код через WhatsApp возникала ошибка:
```
Ошибка отправки кода. Попробуйте еще раз.
```

## Причина
В Django настройках используется database cache для хранения OTP кодов (необходимо для работы с несколькими worker процессами в gunicorn). Таблица `cache_table` не была создана в базе данных.

## Решение

### 1. Локально (для разработки)
```bash
docker-compose exec backend python manage.py createcachetable
```

### 2. На продакшн сервере
Используйте скрипт `fix-otp-cache.bat`:
```bash
.\fix-otp-cache.bat
```

Или вручную через SSH:
```bash
ssh ubuntu@82.115.48.40
cd /home/ubuntu/projects/CRM
docker compose exec backend python manage.py createcachetable
```

## Настройки кэша в settings.py

```python
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
        'LOCATION': 'cache_table',
    }
}
```

**Важно:** Используется database cache вместо LocMemCache, так как LocMemCache не работает с несколькими worker процессами в gunicorn (каждый процесс имеет свою память).

## Проверка работы

### Локально
```bash
curl -X POST http://localhost:8001/api/users/send_otp/ \
  -H "Content-Type: application/json" \
  -d '{"phone":"+77001234567"}'
```

### На продакшн
```bash
curl -X POST https://crm.archeo.kz/api/users/send_otp/ \
  -H "Content-Type: application/json" \
  -d '{"phone":"+77001234567"}'
```

Ожидаемый ответ:
```json
{"message":"OTP sent successfully"}
```

## Логи

Для проверки логов OTP:
```bash
# Локально
docker-compose logs -f backend | grep OTP

# На продакшн
ssh ubuntu@82.115.48.40
cd /home/ubuntu/projects/CRM
docker compose logs -f backend | grep OTP
```

## Автоматическое создание таблицы при деплое

Скрипт `deploy.bat` теперь автоматически создаёт таблицу кэша при деплое:
```bash
.\deploy.bat "commit message"
```

## Green API настройки

Убедитесь, что в `.env.prod` указаны правильные настройки Green API:
```env
GREEN_API_ID_INSTANCE=7105394320
GREEN_API_TOKEN=6184c77e6f374ddc8003957d0d3f4ccc7bc1581c600847d889
GREEN_API_URL=https://7105.api.green-api.com
```

## Дополнительная информация

- OTP коды хранятся в кэше 5 минут (300 секунд)
- Номера телефонов нормализуются к формату `7XXXXXXXXXX`
- Коды отправляются через WhatsApp API (Green API)
- При верификации проверяются альтернативные форматы номера телефона
