@echo off
chcp 65001 >nul
REM Скрипт для настройки SSH подключения без пароля к продакшн серверу

echo ================================
echo Настройка SSH ключа для сервера
echo ================================
echo.

set SERVER_HOST=82.115.48.40
set SERVER_USER=ubuntu
set SSH_KEY=%USERPROFILE%\.ssh\id_rsa.pub

REM Проверяем наличие SSH ключа
if not exist "%SSH_KEY%" (
    echo Ошибка: SSH ключ не найден по пути: %SSH_KEY%
    echo Создайте ключ командой: ssh-keygen -t rsa -b 4096
    pause
    exit /b 1
)

echo [1/3] Публичный ключ найден: %SSH_KEY%
echo.

echo [2/3] Копирование ключа на сервер...
echo.
echo ВНИМАНИЕ: Сейчас потребуется ввести пароль сервера.
echo Пароль: q+I/U9UzOPuXexTC8jbyHgs=
echo.
pause

REM Копируем ключ на сервер используя ssh-copy-id альтернативу
type "%SSH_KEY%" | ssh "%SERVER_USER%@%SERVER_HOST%" "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

if errorlevel 1 (
    echo.
    echo Ошибка при копировании ключа!
    echo.
    echo Попробуйте альтернативный способ:
    echo 1. Скопируйте содержимое файла: %SSH_KEY%
    echo 2. Подключитесь к серверу: ssh %SERVER_USER%@%SERVER_HOST%
    echo 3. Выполните команды:
    echo    mkdir -p ~/.ssh
    echo    chmod 700 ~/.ssh
    echo    nano ~/.ssh/authorized_keys
    echo 4. Вставьте скопированный ключ и сохраните (Ctrl+O, Enter, Ctrl+X)
    echo 5. Выполните: chmod 600 ~/.ssh/authorized_keys
    pause
    exit /b 1
)

echo.
echo [3/3] Проверка подключения без пароля...
echo.

REM Пробуем подключиться без пароля
ssh -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=no "%SERVER_USER%@%SERVER_HOST%" "echo 'Подключение успешно!'" 2>nul

if errorlevel 1 (
    echo.
    echo ВНИМАНИЕ: Автоматическая проверка не прошла.
    echo Попробуйте подключиться вручную: ssh %SERVER_USER%@%SERVER_HOST%
    echo Если попросит пароль - значит настройка не завершена.
    echo.
) else (
    echo.
    echo ================================
    echo Настройка завершена успешно!
    echo ================================
    echo.
    echo Теперь можно подключаться без пароля:
    echo   ssh %SERVER_USER%@%SERVER_HOST%
    echo.
)

pause
