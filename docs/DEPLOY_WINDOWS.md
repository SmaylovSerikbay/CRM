# Автоматический деплой на Windows

## Быстрый старт

После настройки SSH ключа деплой делается одной командой:

```cmd
deploy.bat "описание изменений"
```

или просто:

```cmd
deploy.bat
```

## Установка необходимых инструментов

### 1. Git для Windows

Скачайте и установите: https://git-scm.com/download/win

### 2. OpenSSH Client

OpenSSH обычно уже установлен в Windows 10/11. Проверьте:

```cmd
ssh -V
```

Если нет, установите через PowerShell (от администратора):

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

## Настройка SSH ключа

### Шаг 1: Создание SSH ключа

Откройте PowerShell или Git Bash:

```bash
ssh-keygen -t rsa -b 4096
```

Нажмите Enter для сохранения в стандартное место (`C:\Users\ВАШ_ПОЛЬЗОВАТЕЛЬ\.ssh\id_rsa`)

### Шаг 2: Копирование ключа на сервер

**Вариант 1: Через PowerShell**

```powershell
type $env:USERPROFILE\.ssh\id_rsa.pub | ssh root@89.207.255.13 "cat >> ~/.ssh/authorized_keys"
```

Введите пароль: `r6aQ-osxs0GERy8=`

**Вариант 2: Вручную**

1. Откройте файл с публичным ключом:
   ```cmd
   notepad %USERPROFILE%\.ssh\id_rsa.pub
   ```

2. Скопируйте содержимое

3. Подключитесь к серверу:
   ```cmd
   ssh root@89.207.255.13
   ```
   Пароль: `r6aQ-osxs0GERy8=`

4. На сервере выполните:
   ```bash
   mkdir -p ~/.ssh
   echo "ВСТАВЬТЕ_ВАШ_ПУБЛИЧНЫЙ_КЛЮЧ" >> ~/.ssh/authorized_keys
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   exit
   ```

### Шаг 3: Проверка подключения

```cmd
ssh root@89.207.255.13
```

Если подключается без пароля - готово! ✅

## Использование скриптов деплоя

### deploy.bat - Полный деплой

Делает commit, push и полную пересборку на сервере:

```cmd
deploy.bat "Добавил новую функцию"
```

Или без аргумента (спросит сообщение коммита):

```cmd
deploy.bat
```

### deploy-quick.bat - Быстрый деплой

Только обновляет код без пересборки Docker образов (быстрее):

```cmd
deploy-quick.bat "Исправил опечатку"
```

## Настройка параметров

Если нужно изменить IP, пользователя или путь, отредактируйте в начале файлов `deploy.bat` и `deploy-quick.bat`:

```batch
set PROD_HOST=89.207.255.13
set PROD_USER=root
set PROD_PATH=/root/crm-medical
```

## Первоначальная настройка на сервере

Подключитесь к серверу и настройте проект:

```cmd
ssh root@89.207.255.13
```

На сервере:

```bash
# Установить Docker (если нет)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Клонировать репозиторий
cd /root
git clone ВАШ_РЕПОЗИТОРИЙ_URL crm-medical
cd crm-medical

# Настроить окружение
cp .env.prod .env
nano .env  # Отредактируйте настройки

# Первый запуск
docker compose -f docker-compose.yml build
docker compose -f docker-compose.yml up -d

# Проверить статус
docker compose ps
```

## Дополнительные команды

### Просмотр логов на сервере

```cmd
ssh root@89.207.255.13 "cd /root/crm-medical && docker compose logs -f"
```

### Статус контейнеров

```cmd
ssh root@89.207.255.13 "cd /root/crm-medical && docker compose ps"
```

### Перезапуск контейнеров

```cmd
ssh root@89.207.255.13 "cd /root/crm-medical && docker compose restart"
```

### Подключение к серверу

```cmd
ssh root@89.207.255.13
```

## Использование через Make (опционально)

Если установлен Make для Windows, можно использовать команды из Makefile:

```cmd
make deploy
make deploy-quick
make server-logs
make server-status
```

Установка Make для Windows:
- Через Chocolatey: `choco install make`
- Через Scoop: `scoop install make`
- Или используйте Git Bash (включает make)

## Troubleshooting

### Ошибка: ssh: command not found

Установите OpenSSH Client (см. раздел "Установка необходимых инструментов")

### Ошибка: Permission denied (publickey)

SSH ключ не настроен правильно. Повторите шаги из раздела "Настройка SSH ключа"

### Ошибка: git: command not found

Установите Git для Windows и перезапустите командную строку

### Ошибка при git push

Настройте git remote:

```cmd
git remote add origin ВАШ_РЕПОЗИТОРИЙ_URL
```

### Скрипт не запускается

Убедитесь что находитесь в корневой папке проекта:

```cmd
cd путь\к\проекту
deploy.bat
```

## Пример полного workflow

1. Внесли изменения в код
2. Запустили деплой:
   ```cmd
   deploy.bat "Добавил страницу контрактов"
   ```
3. Скрипт автоматически:
   - Добавит все изменения в git
   - Создаст коммит
   - Отправит в репозиторий
   - Подключится к серверу
   - Обновит код
   - Пересоберет образы
   - Перезапустит контейнеры
4. Готово! ✅

## Безопасность

⚠️ **Важно:**
- Не коммитьте файлы с паролями (.env)
- Храните SSH ключи в безопасности
- Используйте SSH ключи вместо паролей
- Регулярно обновляйте сервер

## Альтернатива: PowerShell скрипты

Если предпочитаете PowerShell, можно создать `.ps1` скрипты с аналогичной логикой.
