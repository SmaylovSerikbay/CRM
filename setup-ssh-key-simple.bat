@echo off
chcp 65001 >nul
REM Простой скрипт для настройки SSH подключения без пароля

echo ================================
echo Настройка SSH ключа для сервера
echo ================================
echo.

set SERVER_HOST=82.115.48.40
set SERVER_USER=ubuntu
set SERVER_PASSWORD=q+I/U9UzOPuXexTC8jbyHgs=
set SSH_KEY=%USERPROFILE%\.ssh\id_rsa.pub

echo Ваш публичный SSH ключ:
echo ----------------------------
type "%SSH_KEY%"
echo ----------------------------
echo.

echo Инструкция:
echo.
echo 1. СКОПИРУЙТЕ весь ключ выше (Ctrl+A, Ctrl+C)
echo.
echo 2. Подключитесь к серверу командой ниже и введите пароль:
echo    ssh %SERVER_USER%@%SERVER_HOST%
echo    Пароль: %SERVER_PASSWORD%
echo.
echo 3. На сервере выполните команды:
echo    mkdir -p ~/.ssh
echo    chmod 700 ~/.ssh
echo    nano ~/.ssh/authorized_keys
echo.
echo 4. В nano нажмите Ctrl+Shift+V (вставить), затем:
echo    Ctrl+O (сохранить)
echo    Enter (подтвердить)
echo    Ctrl+X (выйти)
echo.
echo 5. Установите права:
echo    chmod 600 ~/.ssh/authorized_keys
echo.
echo 6. Выйдите: exit
echo.
echo 7. Проверьте подключение без пароля:
echo    ssh %SERVER_USER%@%SERVER_HOST%
echo.

pause

echo.
echo ========================================
echo Автоматическая попытка копирования...
echo ========================================
echo.
echo ВНИМАНИЕ: Будет запрошен пароль сервера.
echo Пароль: %SERVER_PASSWORD%
echo.
pause

REM Пытаемся скопировать ключ автоматически
type "%SSH_KEY%" | ssh "%SERVER_USER%@%SERVER_HOST%" "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"

if errorlevel 1 (
    echo.
    echo Автоматическое копирование не удалось.
    echo Используйте ручную инструкцию выше.
    pause
    exit /b 1
)

echo.
echo Ключ скопирован! Проверяю подключение...
echo.

ssh -o BatchMode=yes -o ConnectTimeout=5 "%SERVER_USER%@%SERVER_HOST%" "echo 'Подключение успешно!'" 2>nul

if errorlevel 1 (
    echo Подключение без пароля пока не работает.
    echo Попробуйте подключиться вручную для первого раза.
) else (
    echo.
    echo ================================
    echo Успешно! Теперь можно подключаться без пароля:
    echo   ssh %SERVER_USER%@%SERVER_HOST%
    echo ================================
    echo.
)

pause

