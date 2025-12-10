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

echo [1/4] Connecting to server...
echo [2/4] Creating cache table in backend-blue...

ssh -i "%SSH_KEY%" %PROD_USER%@%PROD_HOST% "cd %PROD_PATH% && docker compose -f docker-compose.blue-green.yml exec -T backend-blue python manage.py createcachetable"

if errorlevel 1 (
    echo WARNING: backend-blue might not be running, trying direct container...
    ssh -i "%SSH_KEY%" %PROD_USER%@%PROD_HOST% "cd %PROD_PATH% && docker compose -f docker-compose.blue-green.yml exec backend-blue python manage.py createcachetable"
)

echo [3/4] Creating cache table in backend-green (if running)...

ssh -i "%SSH_KEY%" %PROD_USER%@%PROD_HOST% "cd %PROD_PATH% && docker compose -f docker-compose.blue-green.yml exec -T backend-green python manage.py createcachetable 2>/dev/null || echo 'backend-green not running or table already exists'"

echo [4/4] Verifying cache table in backend-blue...

ssh -i "%SSH_KEY%" %PROD_USER%@%PROD_HOST% "cd %PROD_PATH% && docker compose -f docker-compose.blue-green.yml exec -T backend-blue python -c \"from django.core.cache import cache; cache.set('test', 'ok', 1); print('Cache table verified!' if cache.get('test') == 'ok' else 'Cache table error!')\""

echo.
echo ================================
echo Cache table setup completed!
echo ================================
pause
