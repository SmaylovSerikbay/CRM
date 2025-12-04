@echo off
echo Подключение к серверу для просмотра логов...
echo.
ssh ubuntu@82.115.48.40 "cd /home/ubuntu/projects/CRM && docker compose logs -f --tail=20 backend"
