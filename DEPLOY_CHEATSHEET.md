# 🚀 Шпаргалка по деплою

## Быстрый деплой (Windows)

### Полный деплой с rebuild
```cmd
deploy.bat "описание изменений"
```

### Быстрый деплой без rebuild
```cmd
deploy-quick.bat "описание изменений"
```

### Просмотр логов
```cmd
server-logs.bat
```

### Подключение к серверу
```cmd
server-connect.bat
```

---

## Быстрый деплой (Linux/Mac)

### Полный деплой
```bash
make deploy
```

### Быстрый деплой
```bash
make deploy-quick
```

### Просмотр логов
```bash
make server-logs
```

### Подключение к серверу
```bash
make server-shell
```

---

## Первоначальная настройка

### 1. Создать SSH ключ
```bash
ssh-keygen -t rsa -b 4096
```

### 2. Скопировать на сервер
```bash
ssh-copy-id ubuntu@82.115.48.40
```
Пароль: `q+I/U9UzOPuXexTC8jbyHgs=`

### 3. Проверить подключение
```bash
ssh ubuntu@82.115.48.40
```

### 4. Настроить проект на сервере
```bash
# На сервере
cd /root
git clone ВАШ_РЕПО crm-medical
cd crm-medical
cp .env.prod .env
nano .env  # Настроить
docker compose -f docker-compose.yml up -d
```

---

## Полезные команды на сервере

### Статус контейнеров
```bash
docker compose ps
```

### Логи
```bash
docker compose logs -f
docker compose logs backend
docker compose logs frontend
```

### Перезапуск
```bash
docker compose restart
docker compose restart backend
docker compose restart frontend
```

### Пересборка
```bash
docker compose build
docker compose up -d
```

### Остановка
```bash
docker compose down
```

### Очистка
```bash
docker compose down -v  # С удалением volumes
docker system prune -a  # Очистка всего Docker
```

---

## Настройки в Makefile

```makefile
PROD_HOST := 82.115.48.40
PROD_USER := ubuntu
PROD_PATH := /home/ubuntu/projects/CRM
SSH_KEY := ~/.ssh/id_rsa
```

---

## Настройки в .bat файлах

```batch
set PROD_HOST=82.115.48.40
set PROD_USER=ubuntu
set PROD_PATH=/home/ubuntu/projects/CRM
set SSH_KEY=%USERPROFILE%\.ssh\id_rsa
```

---

## Troubleshooting

### SSH не работает
```bash
# Проверить ключ
ssh -v ubuntu@82.115.48.40

# Пересоздать ключ
ssh-keygen -t rsa -b 4096
ssh-copy-id ubuntu@82.115.48.40
```

### Git push не работает
```bash
# Проверить remote
git remote -v

# Добавить remote
git remote add origin URL

# Изменить remote
git remote set-url origin URL
```

### Контейнеры не запускаются
```bash
# Подключиться к серверу
ssh ubuntu@82.115.48.40

# Проверить логи
cd /home/ubuntu/projects/CRM
docker compose logs

# Пересобрать
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## Workflow

1. **Внести изменения** в код
2. **Запустить деплой**: `deploy.bat "что изменил"`
3. **Проверить**: открыть сайт
4. **Если проблемы**: `server-logs.bat`

---

## Безопасность

✅ **Делать:**
- Использовать SSH ключи
- Регулярно обновлять сервер
- Делать бэкапы БД

❌ **Не делать:**
- Коммитить .env файлы
- Хранить пароли в коде
- Использовать слабые пароли

---

## Контакты сервера

- **IP:** 82.115.48.40
- **User:** ubuntu
- **Пароль:** q+I/U9UzOPuXexTC8jbyHgs= (только для первой настройки!)
- **Путь проекта:** /home/ubuntu/projects/CRM

---

📖 **Полная документация:**
- [DEPLOY_SETUP.md](./docs/DEPLOY_SETUP.md) - Linux/Mac
- [DEPLOY_WINDOWS.md](./docs/DEPLOY_WINDOWS.md) - Windows
