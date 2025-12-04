@echo off
chcp 65001 >nul
REM Скрипт для создания таблицы кэша на продакшн сервере

echo ================================
echo Fixing OTP Cache Table
echo ================================
echo.

REM Настройки
set PROD_HOST=82.115.48.40
set PROD_USER=ubuntu
set PROD_PATH=/home/ubuntu/projects/CRM
set SSH_KEY=%USERPROFILE%\.ssh\id_rsa

echo [1/2] Connecting to server...
echo [2/2] Creating cache table...

ssh -i "%SSH_KEY%" %PROD_USER%@%PROD_HOST% "cd %PROD_PATH% && docker compose -f docker-compose.yml exec -T backend python manage.py createcachetable"

echo.
echo ================================
echo Cache table created successfully!
echo ================================
pause
