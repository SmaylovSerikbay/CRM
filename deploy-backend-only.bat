@echo off
echo ========================================
echo   Деплой только backend на сервер
echo ========================================
echo.

echo [1/3] Подключение к серверу...
ssh ubuntu@82.115.48.40 "cd /home/ubuntu/projects/CRM && git pull origin main"

echo.
echo [2/3] Пересборка backend контейнера...
ssh ubuntu@82.115.48.40 "cd /home/ubuntu/projects/CRM && docker compose build backend"

echo.
echo [3/3] Перезапуск backend...
ssh ubuntu@82.115.48.40 "cd /home/ubuntu/projects/CRM && docker compose up -d backend"

echo.
echo ========================================
echo   Деплой завершен!
echo ========================================
echo.
echo Просмотр логов:
ssh ubuntu@82.115.48.40 "cd /home/ubuntu/projects/CRM && docker compose logs --tail=30 backend"

pause
