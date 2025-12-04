@echo off
REM Скрипт для настройки SSH ключа на Windows

echo ================================
echo Настройка SSH для деплоя
echo ================================
echo.

set PROD_HOST=82.115.48.40
set PROD_USER=ubuntu
set SSH_DIR=%USERPROFILE%\.ssh
set SSH_KEY=%SSH_DIR%\id_rsa

REM Проверка наличия SSH
where ssh >nul 2>nul
if errorlevel 1 (
    echo [ОШИБКА] SSH не установлен!
    echo.
    echo Установите OpenSSH:
    echo 1. Откройте PowerShell от администратора
    echo 2. Выполните: Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
    echo.
    pause
    exit /b 1
)

echo [1/4] Проверка SSH ключа...
if exist "%SSH_KEY%" (
    echo SSH ключ уже существует: %SSH_KEY%
    echo.
    set /p RECREATE="Создать новый ключ? (y/N): "
    if /i not "%RECREATE%"=="y" goto :copy_key
)

echo.
echo [2/4] Создание SSH ключа...
if not exist "%SSH_DIR%" mkdir "%SSH_DIR%"
ssh-keygen -t rsa -b 4096 -f "%SSH_KEY%" -N ""
if errorlevel 1 (
    echo [ОШИБКА] Не удалось создать SSH ключ
    pause
    exit /b 1
)
echo SSH ключ создан успешно!

:copy_key
echo.
echo [3/4] Копирование ключа на сервер...
echo.
echo Сейчас потребуется ввести пароль сервера: r6aQ-osxs0GERy8=
echo.
pause

type "%SSH_KEY%.pub" | ssh %PROD_USER%@%PROD_HOST% "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
if errorlevel 1 (
    echo.
    echo [ОШИБКА] Не удалось скопировать ключ
    echo.
    echo Попробуйте вручную:
    echo 1. Откройте файл: notepad "%SSH_KEY%.pub"
    echo 2. Скопируйте содержимое
    echo 3. Подключитесь к серверу: ssh %PROD_USER%@%PROD_HOST%
    echo 4. Выполните: mkdir -p ~/.ssh ^&^& echo "ВАSH_КЛЮЧ" ^>^> ~/.ssh/authorized_keys
    echo.
    pause
    exit /b 1
)

echo.
echo [4/4] Проверка подключения...
ssh -o BatchMode=yes -o ConnectTimeout=5 %PROD_USER%@%PROD_HOST% "echo 'SSH работает!'" 2>nul
if errorlevel 1 (
    echo.
    echo [ПРЕДУПРЕЖДЕНИЕ] Не удалось подключиться без пароля
    echo Попробуйте подключиться вручную: ssh %PROD_USER%@%PROD_HOST%
    echo.
) else (
    echo.
    echo ================================
    echo ✅ SSH настроен успешно!
    echo ================================
    echo.
    echo Теперь можно использовать:
    echo   deploy.bat "описание изменений"
    echo   deploy-quick.bat "описание изменений"
    echo   server-logs.bat
    echo   server-connect.bat
    echo.
)

pause
