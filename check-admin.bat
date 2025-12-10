@echo off
echo ========================================
echo Проверка Django Admin
echo ========================================

echo.
echo 1. Проверяем статус контейнеров:
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
echo 2. Проверяем доступность бэкенда напрямую:
echo Тестируем http://localhost:8001/api/health/
curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://localhost:8001/api/health/ 2>nul || echo "Ошибка подключения к localhost:8001"

echo.
echo 3. Проверяем админку напрямую:
echo Тестируем http://localhost:8001/admin/
curl -s -o nul -w "HTTP Status: %%{http_code}\n" http://localhost:8001/admin/ 2>nul || echo "Ошибка подключения к localhost:8001/admin/"

echo.
echo 4. Проверяем логи бэкенда:
echo Последние 10 строк логов:
for /f "tokens=*" %%i in ('docker ps --format "{{.Names}}" ^| findstr backend') do (
    echo Логи контейнера %%i:
    docker logs --tail 10 %%i
)

echo.
echo 5. Проверяем суперпользователя:
echo Выполняем команду в контейнере...
for /f "tokens=*" %%i in ('docker ps --format "{{.Names}}" ^| findstr backend') do (
    echo Контейнер: %%i
    docker exec %%i python manage.py shell -c "from django.contrib.auth.models import User; print('Суперпользователи:', User.objects.filter(is_superuser=True).count())"
)

echo.
echo ========================================
echo Проверка завершена
echo ========================================
pause