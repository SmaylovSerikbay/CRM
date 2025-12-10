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

echo [1/3] Connecting to server...
echo [2/3] Creating cache table...

ssh -i "%SSH_KEY%" %PROD_USER%@%PROD_HOST% "cd %PROD_PATH% && docker compose -f docker-compose.yml exec -T backend python manage.py createcachetable"

if errorlevel 1 (
    echo.
    echo ERROR: Failed to create cache table. Trying alternative method...
    ssh -i "%SSH_KEY%" %PROD_USER%@%PROD_HOST% "cd %PROD_PATH% && docker compose -f docker-compose.yml exec backend python manage.py createcachetable"
)

echo [3/3] Verifying cache table...

ssh -i "%SSH_KEY%" %PROD_USER%@%PROD_HOST% "cd %PROD_PATH% && docker compose -f docker-compose.yml exec -T backend python -c \"from django.core.cache import cache; cache.set('test', 'ok', 1); print('Cache table verified!' if cache.get('test') == 'ok' else 'Cache table error!')\""

echo.
echo ================================
echo Cache table setup completed!
echo ================================
pause
