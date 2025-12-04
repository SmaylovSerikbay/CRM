#!/bin/bash

# Обертка для автоматического переключения NPM в процессе деплоя

# Загружаем конфигурацию NPM если есть
if [ -f ".env.npm" ]; then
    export $(grep -v '^#' .env.npm | xargs)
fi

# Проверяем что NPM API настроен
if [ "$NPM_EMAIL" = "admin@example.com" ] || [ "$NPM_PASSWORD" = "changeme" ]; then
    echo "⚠️  NPM API не настроен"
    echo "Отредактируйте .env.npm с вашими данными NPM"
    echo ""
    echo "Переключение вручную:"
    return 1
fi

# Вызываем скрипт переключения
bash scripts/npm-switch.sh "$1" "$2"
