#!/bin/bash

echo "=== ДИАГНОСТИКА ПРОДАКШЕНА ==="
echo "Время: $(date)"
echo

echo "1. Статус контейнеров:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo

echo "2. Активные порты:"
netstat -tlnp | grep -E ':(3001|8001|80|443)' || echo "Команда netstat недоступна"
echo

echo "3. Проверка подключения к backend:"
curl -s -o /dev/null -w "HTTP %{http_code} - %{time_total}s\n" http://localhost:8001/api/health/ || echo "Backend недоступен"
echo

echo "4. Проверка подключения к frontend:"
curl -s -o /dev/null -w "HTTP %{http_code} - %{time_total}s\n" http://localhost:3001/ || echo "Frontend недоступен"
echo

echo "5. Логи backend (последние 10 строк):"
docker logs --tail 10 crm-backend-blue-1 2>/dev/null || echo "Backend контейнер не найден"
echo

echo "6. Логи frontend (последние 10 строк):"
docker logs --tail 10 crm-frontend-blue-1 2>/dev/null || echo "Frontend контейнер не найден"
echo

echo "7. Проверка nginx proxy manager:"
curl -s -o /dev/null -w "NPM Status: HTTP %{http_code}\n" http://localhost:81/ || echo "NPM недоступен"
echo

echo "=== КОНЕЦ ДИАГНОСТИКИ ==="