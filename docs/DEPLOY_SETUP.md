# Настройка автоматического деплоя

## Быстрый старт

После настройки SSH ключа, деплой делается одной командой:

```bash
make deploy
```

Эта команда автоматически:
1. Делает git commit всех изменений
2. Пушит в репозиторий
3. Подключается к серверу
4. Обновляет код
5. Пересобирает Docker образы
6. Перезапускает контейнеры

## Настройка SSH ключа

### Шаг 1: Создание SSH ключа (если еще нет)

```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

Нажмите Enter для сохранения в стандартное место (`~/.ssh/id_rsa`)

### Шаг 2: Копирование ключа на сервер

**Вариант 1: Автоматически (рекомендуется)**
```bash
ssh-copy-id ubuntu@82.115.48.40
```

**Вариант 2: Вручную**
```bash
# Показать публичный ключ
cat ~/.ssh/id_rsa.pub

# Подключиться к серверу с паролем
ssh ubuntu@82.115.48.40

# На сервере добавить ключ
mkdir -p ~/.ssh
echo "ВАШ_ПУБЛИЧНЫЙ_КЛЮЧ" >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
exit
```

### Шаг 3: Проверка подключения

```bash
ssh ubuntu@82.115.48.40
```

Если подключается без пароля - всё готово!

## Настройка проекта на сервере

### Первоначальная настройка

```bash
# Подключиться к серверу
ssh ubuntu@82.115.48.40

# Установить Docker (если еще не установлен)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Клонировать репозиторий
cd /root
git clone YOUR_REPO_URL crm-medical
cd crm-medical

# Настроить .env файлы
cp .env.prod .env

# Первый запуск
docker compose -f docker-compose.yml build
docker compose -f docker-compose.yml up -d
```

## Доступные команды деплоя

### Основные команды

```bash
make deploy              # Полный деплой с rebuild образов
make deploy-quick        # Быстрый деплой без rebuild
make git-push           # Только commit и push в git
make server-update      # Только обновление на сервере
```

### Мониторинг и управление

```bash
make server-logs        # Показать логи с сервера
make server-status      # Статус контейнеров на сервере
make server-restart     # Перезапустить контейнеры
make server-shell       # SSH подключение к серверу
```

## Настройка параметров деплоя

Если нужно изменить параметры (IP, путь, пользователь), отредактируйте в `Makefile`:

```makefile
PROD_HOST := 82.115.48.40
PROD_USER := ubuntu
PROD_PATH := /home/ubuntu/projects/CRM
SSH_KEY := ~/.ssh/id_rsa
```

## Примеры использования

### Обычный деплой после изменений

```bash
# Внесли изменения в код
# Запускаем деплой
make deploy
# Вводим сообщение коммита когда попросит
```

### Быстрый деплой (только код, без rebuild)

Используйте когда меняли только код, без изменений в зависимостях:

```bash
make deploy-quick
```

### Только обновить код на сервере

Если уже сделали git push вручную:

```bash
make server-update
```

### Посмотреть логи на сервере

```bash
make server-logs
```

### Проверить статус на сервере

```bash
make server-status
```

## Troubleshooting

### Ошибка: Permission denied (publickey)

SSH ключ не настроен. Выполните шаги из раздела "Настройка SSH ключа"

### Ошибка: Could not resolve hostname

Проверьте IP адрес в Makefile (переменная PROD_HOST)

### Ошибка: git push failed

Убедитесь что настроен git remote:

```bash
git remote -v
# Если нет origin, добавьте:
git remote add origin YOUR_REPO_URL
```

### Контейнеры не запускаются на сервере

Проверьте логи:

```bash
make server-logs
```

Или подключитесь к серверу:

```bash
make server-shell
cd /home/ubuntu/projects/CRM
docker compose ps
docker compose logs
```

## Безопасность

1. **Никогда не коммитьте** файлы с паролями (.env файлы)
2. Используйте SSH ключи вместо паролей
3. Регулярно обновляйте систему на сервере:
   ```bash
   ssh ubuntu@82.115.48.40 "apt update && apt upgrade -y"
   ```

## Автоматизация через CI/CD (опционально)

Для полной автоматизации можно настроить GitHub Actions или GitLab CI.
Создайте файл `.github/workflows/deploy.yml` для автоматического деплоя при push в main.
