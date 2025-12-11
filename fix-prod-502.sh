#!/bin/bash

echo "=== ИСПРАВЛЕНИЕ ОШИБКИ 502 НА ПРОДЕ ==="
echo "Время: $(date)"
echo

echo "1. Проверяем состояние деплоя:"
if [ -f ".active-color" ]; then
    echo "Активный цвет: $(cat .active-color)"
else
    echo "Файл состояния не найден"
fi
echo

echo "2. Статус всех контейнеров:"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(crm-|NAMES)"
echo

echo "3. Запускаем blue окружение (которое должно быть активным):"
docker compose -f docker-compose.blue-green.yml --profile blue up -d
echo

echo "4. Ждем 30 секунд для запуска..."
sleep 30
echo

echo "5. Проверяем здоровье сервисов:"
echo "Backend health:"
curl -s -o /dev/null -w "HTTP %{http_code} - %{time_total}s\n" http://localhost:8001/api/health/ || echo "Backend недоступен"

echo "Frontend health:"
curl -s -o /dev/null -w "HTTP %{http_code} - %{time_total}s\n" http://localhost:3001/ || echo "Frontend недоступен"
echo

echo "6. Если сервисы работают, проверьте сайт: https://crm.archeo.kz"
echo "7. Если сайт работает, можно остановить green окружение:"
echo "   docker compose -f docker-compose.blue-green.yml --profile green down"
echo

echo "=== ДИАГНОСТИКА ЗАВЕРШЕНА ==="