# Настройка CORS для продакшена

## Что было исправлено

### 1. Backend CORS настройки (backend/crm_backend/settings.py)
Добавлены разрешенные источники:
- `https://crm.archeo.kz` - основной продакшн домен
- `http://crm.archeo.kz` - на случай HTTP (но лучше использовать HTTPS)
- `http://localhost:3001` - для dev режима
- `http://localhost:3000` - для prod режима локально

### 2. Переменные окружения (.env.prod)
Исправлено:
- `DEBUG=False` (было True - небезопасно для продакшена!)
- `ALLOWED_HOSTS=crm.archeo.kz` (была опечатка crm.archeo.kz.kz)
- `NEXT_PUBLIC_API_URL=https://crm.archeo.kz/api` (было localhost)

## Важно для продакшена

### Nginx конфигурация
Убедитесь, что ваш nginx правильно проксирует запросы:

```nginx
server {
    listen 80;
    server_name crm.archeo.kz;
    
    # Редирект на HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name crm.archeo.kz;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Django Admin
    location /admin/ {
        proxy_pass http://localhost:8000/admin/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Django Static files
    location /static/ {
        proxy_pass http://localhost:8000/static/;
    }
}
```

### SSL сертификат
Для HTTPS используйте Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d crm.archeo.kz
```

### Проверка после деплоя
1. Проверьте, что бэкенд отвечает: `curl https://crm.archeo.kz/api/`
2. Проверьте CORS заголовки:
```bash
curl -H "Origin: https://crm.archeo.kz" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://crm.archeo.kz/api/users/send_otp/ -v
```

Должны увидеть заголовки:
- `Access-Control-Allow-Origin: https://crm.archeo.kz`
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Methods: POST, OPTIONS`

### Деплой изменений
```bash
# Остановить контейнеры
docker-compose down

# Пересобрать с новыми настройками
docker-compose build --no-cache

# Запустить
docker-compose up -d

# Проверить логи
docker-compose logs -f backend
```

## Безопасность

### Обязательно измените SECRET_KEY
В `.env.prod` сгенерируйте новый безопасный ключ:
```python
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### Рекомендации
- ✅ DEBUG=False в продакшене
- ✅ Используйте HTTPS (SSL сертификат)
- ✅ Ограничьте ALLOWED_HOSTS только вашим доменом
- ✅ Используйте сильный SECRET_KEY
- ✅ Регулярно обновляйте зависимости
- ✅ Настройте firewall (только порты 80, 443, 22)
