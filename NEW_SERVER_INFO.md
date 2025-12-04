# Новый Production Сервер

## Данные для доступа

**Виртуальная машина:** medcrm

### Технические характеристики:
- **Процессор:** 1 CPU
- **Оперативная память:** 1 ГБ
- **Загрузочный диск:** 20 ГБ
- **Тарифный план:** Basic-1
- **ОС:** Ubuntu 22.04 LTS

### SSH доступ (порт 22):
- **IP-адрес:** 82.115.48.40
- **IPv6-адрес:** 2a00:5da0:2005:1::583
- **Пользователь:** ubuntu
- **Пароль:** q+I/U9UzOPuXexTC8jbyHgs=

### Путь к проекту:
```
/home/ubuntu/projects/CRM
```

## Первое подключение

```bash
ssh ubuntu@82.115.48.40
```

Для получения root-привилегий:
```bash
sudo -i
```

## Что было обновлено

Все файлы конфигурации и документации обновлены с нового сервера:

### Обновленные файлы:
- ✅ `Makefile` - настройки деплоя
- ✅ `deploy.bat` - скрипт деплоя для Windows
- ✅ `deploy-quick.bat` - быстрый деплой
- ✅ `setup-ssh.bat` - настройка SSH
- ✅ `server-connect.bat` - подключение к серверу
- ✅ `server-logs.bat` - просмотр логов
- ✅ Вся документация в `docs/`
- ✅ `DEPLOY.md`, `START_HERE.md`, `QUICK_DEPLOY.txt`
- ✅ `DEPLOY_CHEATSHEET.md`, `DEPLOY_FILES.md`, `DEPLOY_SUMMARY.md`

### Изменения:
- **Старый IP:** 89.207.255.13 → **Новый IP:** 82.115.48.40
- **Старый пользователь:** root → **Новый пользователь:** ubuntu
- **Старый путь:** /root/projects/CRM → **Новый путь:** /home/ubuntu/projects/CRM
- **Старый пароль:** r6aQ-osxs0GERy8= → **Новый пароль:** q+I/U9UzOPuXexTC8jbyHgs=

## Следующие шаги

1. **Настроить SSH ключ:**
   ```bash
   ssh-copy-id ubuntu@82.115.48.40
   ```

2. **Подключиться к серверу:**
   ```bash
   ssh ubuntu@82.115.48.40
   ```

3. **Установить Docker (если нужно):**
   ```bash
   sudo -i
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

4. **Создать директорию и клонировать проект:**
   ```bash
   sudo mkdir -p /home/ubuntu/projects
   sudo chown ubuntu:ubuntu /home/ubuntu/projects
   cd /home/ubuntu/projects
   git clone ВАШ_РЕПОЗИТОРИЙ_URL CRM
   cd CRM
   ```

5. **Настроить окружение:**
   ```bash
   cp .env.prod .env
   nano .env  # Отредактировать настройки
   ```

6. **Запустить проект:**
   ```bash
   docker compose -f docker-compose.yml build
   docker compose -f docker-compose.yml up -d
   ```

## Проверка

После настройки проверьте, что все работает:

```bash
# Статус контейнеров
docker compose ps

# Логи
docker compose logs -f

# Проверка с локальной машины
make server-status
make server-logs
```

---

**Дата обновления:** 4 декабря 2025
