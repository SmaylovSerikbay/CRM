#!/bin/bash
# Скрипт для пересборки frontend с правильными переменными окружения

set -e

echo "🔧 Пересборка frontend контейнера..."

# Проверяем наличие .env.prod
if [ ! -f .env.prod ]; then
    echo "❌ Файл .env.prod не найден!"
    exit 1
fi

# Загружаем переменные из .env.prod
export $(grep -v '^#' .env.prod | xargs)

# Проверяем, что NEXT_PUBLIC_API_URL установлен
if [ -z "$NEXT_PUBLIC_API_URL" ]; then
    echo "⚠️  NEXT_PUBLIC_API_URL не установлен в .env.prod, используем значение по умолчанию"
    export NEXT_PUBLIC_API_URL="https://crm.archeo.kz/api"
fi

echo "📦 Используется NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"

# Останавливаем контейнеры
echo "🛑 Остановка контейнеров..."
docker compose -f docker-compose.yml down

# Пересобираем frontend с --no-cache
echo "🔨 Пересборка frontend..."
docker compose -f docker-compose.yml build --no-cache frontend

# Запускаем контейнеры
echo "🚀 Запуск контейнеров..."
docker compose -f docker-compose.yml up -d

echo "✅ Готово! Frontend пересобран с правильными переменными окружения."
echo "📊 Проверьте логи: docker compose -f docker-compose.yml logs -f frontend"

