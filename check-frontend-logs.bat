@echo off
echo ========================================
echo Проверка логов фронтенда на проде
echo ========================================
echo.

echo Подключаемся к серверу...
ssh root@89.169.44.237 "cd /root/CRM && docker-compose logs -f --tail=100 frontend"
