#!/bin/bash

# Hot Deploy - мгновенное обновление кода без пересборки Docker образов
# Использование: ./scripts/hot-deploy.sh [backend|frontend|all]

set -e

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Определяем активное окружение
get_active_color() {
    if [ -f ".deployment-state" ]; then
        cat ".deployment-state"
    else
        echo "blue"
    fi
}

ACTIVE=$(get_active_color)

# Определяем порты активного окружения
if [ "$ACTIVE" = "blue" ]; then
    BACKEND_PORT=8001
    FRONTEND_PORT=3001
    BACKEND_CONTAINER="crm-backend-blue-1"
    FRONTEND_CONTAINER="crm-frontend-blue-1"
else
    BACKEND_PORT=8002
    FRONTEND_PORT=3002
    BACKEND_CONTAINER="crm-backend-green-1"
    FRONTEND_CONTAINER="crm-frontend-green-1"
fi

# Функция для hot-deploy backend
hot_deploy_backend() {
    echo -e "${YELLOW}🔥 Hot Deploy Backend...${NC}"
    
    # Проверяем что контейнер запущен
    if ! docker ps --format '{{.Names}}' | grep -q "^${BACKEND_CONTAINER}$"; then
        echo -e "${RED}✗ Контейнер $BACKEND_CONTAINER не запущен${NC}"
        return 1
    fi
    
    echo -e "${BLUE}Копирование кода backend...${NC}"
    docker cp backend/. ${BACKEND_CONTAINER}:/app/
    
    echo -e "${BLUE}Перезапуск контейнера...${NC}"
    # Используем docker restart вместо pkill, так как pkill может отсутствовать
    docker restart ${BACKEND_CONTAINER}
    
    echo -e "${GREEN}✓ Backend обновлен! (порт $BACKEND_PORT)${NC}"
}

# Функция для hot-deploy frontend
hot_deploy_frontend() {
    echo -e "${YELLOW}🔥 Hot Deploy Frontend...${NC}"
    
    echo -e "${RED}⚠️  ВНИМАНИЕ: Hot deploy для frontend не поддерживается!${NC}"
    echo -e "${YELLOW}Frontend использует production build без npm/node_modules в runtime.${NC}"
    echo -e "${YELLOW}Для обновления frontend используйте:${NC}"
    echo -e "  ${BLUE}make bg-auto-fast${NC}  - быстрый деплой (~2-3 мин)"
    echo -e "  ${BLUE}make bg-auto-full${NC}  - полный деплой (~10-15 мин)"
    echo ""
    return 1
}

# Главная функция
main() {
    local component=${1:-all}
    local start_time=$(date +%s)
    
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  🔥 HOT DEPLOY (без пересборки Docker)                   ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "Активное окружение: ${GREEN}$ACTIVE${NC}"
    echo -e "Компонент: ${YELLOW}$component${NC}"
    echo ""
    
    case "$component" in
        backend)
            hot_deploy_backend
            ;;
        frontend)
            hot_deploy_frontend
            ;;
        all)
            hot_deploy_backend
            echo ""
            hot_deploy_frontend
            ;;
        *)
            echo -e "${RED}Неизвестный компонент: $component${NC}"
            echo "Использование: $0 [backend|frontend|all]"
            exit 1
            ;;
    esac
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ HOT DEPLOY ЗАВЕРШЕН!                                  ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}⏱️  Время: ${GREEN}${duration} сек${NC}"
    echo -e "Backend:  ${GREEN}http://localhost:$BACKEND_PORT${NC}"
    echo -e "Frontend: ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
    echo ""
    echo -e "${YELLOW}💡 Совет: Hot deploy работает только для изменений кода.${NC}"
    echo -e "${YELLOW}   Если изменились зависимости, используйте make bg-auto-fast${NC}"
}

main "$@"
