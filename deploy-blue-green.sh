#!/bin/bash

# Blue-Green Deployment Script для работы с Nginx Proxy Manager
# Использование: ./deploy-blue-green.sh [deploy|switch|rollback|status]

set -e

COMPOSE_FILE="docker-compose.blue-green.yml"
STATE_FILE=".deployment-state"

# Порты для blue/green окружений
BACKEND_BLUE_PORT=8001
BACKEND_GREEN_PORT=8002
FRONTEND_BLUE_PORT=3001
FRONTEND_GREEN_PORT=3002

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Определяем текущий активный цвет из файла состояния
get_active_color() {
    if [ -f "$STATE_FILE" ]; then
        cat "$STATE_FILE"
    else
        echo "blue"  # По умолчанию blue
    fi
}

# Сохраняем активный цвет
set_active_color() {
    echo "$1" > "$STATE_FILE"
}

# Определяем неактивный цвет
get_inactive_color() {
    local active=$(get_active_color)
    if [ "$active" = "blue" ]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Проверка здоровья сервиса
check_health() {
    local service=$1
    local max_attempts=30
    local attempt=0
    
    echo -e "${YELLOW}Проверка здоровья $service...${NC}"
    
    while [ $attempt -lt $max_attempts ]; do
        if docker compose -f "$COMPOSE_FILE" ps "$service" | grep -q "healthy"; then
            echo -e "${GREEN}✓ $service здоров${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    echo -e "${RED}✗ $service не прошел проверку здоровья${NC}"
    return 1
}

# Деплой новой версии
deploy() {
    local active=$(get_active_color)
    local inactive=$(get_inactive_color)
    local start_time=$(date +%s)
    
    echo -e "${BLUE}=== Blue-Green Deployment ===${NC}"
    echo -e "Активный: ${GREEN}$active${NC}"
    echo -e "Деплой в: ${YELLOW}$inactive${NC}"
    echo -e "Время старта: $(date '+%H:%M:%S')"
    echo ""
    
    # Собираем новую версию
    echo -e "${YELLOW}Шаг 1: Сборка $inactive окружения...${NC}"
    docker compose -f "$COMPOSE_FILE" --profile "$inactive" build --no-cache
    
    # Запускаем новую версию
    echo -e "${YELLOW}Шаг 2: Запуск $inactive окружения...${NC}"
    docker compose -f "$COMPOSE_FILE" --profile "$inactive" up -d
    
    # Проверяем здоровье
    echo -e "${YELLOW}Шаг 3: Проверка здоровья сервисов...${NC}"
    if ! check_health "backend-$inactive"; then
        echo -e "${RED}Деплой провален: backend-$inactive не здоров${NC}"
        docker compose -f "$COMPOSE_FILE" --profile "$inactive" down
        exit 1
    fi
    
    if ! check_health "frontend-$inactive"; then
        echo -e "${RED}Деплой провален: frontend-$inactive не здоров${NC}"
        docker compose -f "$COMPOSE_FILE" --profile "$inactive" down
        exit 1
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    echo -e "${GREEN}✓ Деплой успешен! $inactive окружение готово.${NC}"
    echo -e "${YELLOW}⏱️  Время деплоя: ${minutes} мин ${seconds} сек${NC}"
    echo -e "${YELLOW}Используйте './deploy-blue-green.sh switch' для переключения трафика${NC}"
}

# Переключение трафика
switch() {
    local active=$(get_active_color)
    local inactive=$(get_inactive_color)
    
    echo -e "${BLUE}=== Переключение трафика ===${NC}"
    echo -e "С ${RED}$active${NC} на ${GREEN}$inactive${NC}"
    echo ""
    
    # Проверяем, что новое окружение запущено
    if ! docker compose -f "$COMPOSE_FILE" ps "backend-$inactive" | grep -q "Up"; then
        echo -e "${RED}Ошибка: $inactive окружение не запущено${NC}"
        echo -e "${YELLOW}Сначала выполните: ./deploy-blue-green.sh deploy${NC}"
        exit 1
    fi
    
    # Определяем порты для переключения
    if [ "$inactive" = "green" ]; then
        BACKEND_PORT=$BACKEND_GREEN_PORT
        FRONTEND_PORT=$FRONTEND_GREEN_PORT
    else
        BACKEND_PORT=$BACKEND_BLUE_PORT
        FRONTEND_PORT=$FRONTEND_BLUE_PORT
    fi
    
    echo -e "${YELLOW}=== ИНСТРУКЦИЯ ПО ПЕРЕКЛЮЧЕНИЮ В NGINX PROXY MANAGER ===${NC}"
    echo ""
    echo -e "${GREEN}1. Backend API:${NC}"
    echo -e "   Откройте Proxy Host для: ${YELLOW}crm.archeo.kz/api${NC}"
    echo -e "   Измените Forward Hostname/IP на: ${GREEN}localhost:$BACKEND_PORT${NC}"
    echo ""
    echo -e "${GREEN}2. Frontend:${NC}"
    echo -e "   Откройте Proxy Host для: ${YELLOW}crm.archeo.kz${NC}"
    echo -e "   Измените Forward Hostname/IP на: ${GREEN}localhost:$FRONTEND_PORT${NC}"
    echo ""
    echo -e "${YELLOW}После переключения в Nginx Proxy Manager:${NC}"
    echo -e "  - Проверьте работу сайта"
    echo -e "  - Если все ОК, выполните: ${GREEN}./deploy-blue-green.sh confirm${NC}"
    echo -e "  - Для отката выполните: ${RED}./deploy-blue-green.sh rollback${NC}"
    echo ""
    
    # Сохраняем информацию о переключении для отката
    echo "$active" > ".deployment-state.backup"
    
    read -p "Переключили в Nginx Proxy Manager? Подтвердить? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        set_active_color "$inactive"
        echo -e "${GREEN}✓ Активное окружение изменено на $inactive${NC}"
        echo -e "${YELLOW}Старое окружение ($active) все еще работает для отката${NC}"
        echo -e "${YELLOW}Используйте './deploy-blue-green.sh cleanup' для остановки старого окружения${NC}"
    else
        echo -e "${YELLOW}Переключение отменено${NC}"
    fi
}

# Откат к предыдущей версии
rollback() {
    local active=$(get_active_color)
    
    # Проверяем наличие бэкапа
    if [ ! -f ".deployment-state.backup" ]; then
        echo -e "${RED}Ошибка: информация для отката не найдена${NC}"
        exit 1
    fi
    
    local previous=$(cat ".deployment-state.backup")
    
    echo -e "${BLUE}=== Откат к предыдущей версии ===${NC}"
    echo -e "Откат с ${RED}$active${NC} на ${GREEN}$previous${NC}"
    echo ""
    
    # Определяем порты для отката
    if [ "$previous" = "blue" ]; then
        BACKEND_PORT=$BACKEND_BLUE_PORT
        FRONTEND_PORT=$FRONTEND_BLUE_PORT
    else
        BACKEND_PORT=$BACKEND_GREEN_PORT
        FRONTEND_PORT=$FRONTEND_GREEN_PORT
    fi
    
    echo -e "${YELLOW}=== ИНСТРУКЦИЯ ПО ОТКАТУ В NGINX PROXY MANAGER ===${NC}"
    echo ""
    echo -e "${GREEN}1. Backend API:${NC}"
    echo -e "   Откройте Proxy Host для: ${YELLOW}crm.archeo.kz/api${NC}"
    echo -e "   Верните Forward Hostname/IP на: ${GREEN}localhost:$BACKEND_PORT${NC}"
    echo ""
    echo -e "${GREEN}2. Frontend:${NC}"
    echo -e "   Откройте Proxy Host для: ${YELLOW}crm.archeo.kz${NC}"
    echo -e "   Верните Forward Hostname/IP на: ${GREEN}localhost:$FRONTEND_PORT${NC}"
    echo ""
    
    read -p "Откатили в Nginx Proxy Manager? Подтвердить? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        set_active_color "$previous"
        rm -f ".deployment-state.backup"
        echo -e "${GREEN}✓ Откат выполнен успешно${NC}"
    else
        echo -e "${YELLOW}Откат отменен${NC}"
    fi
}

# Очистка старого окружения
cleanup() {
    local active=$(get_active_color)
    local inactive=$(get_inactive_color)
    
    echo -e "${BLUE}=== Очистка неактивного окружения ===${NC}"
    echo -e "Остановка ${RED}$inactive${NC} окружения"
    echo ""
    
    read -p "Вы уверены? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker compose -f "$COMPOSE_FILE" --profile "$inactive" down
        echo -e "${GREEN}✓ $inactive окружение остановлено${NC}"
    fi
}

# Статус окружений
status() {
    local active=$(get_active_color)
    
    echo -e "${BLUE}=== Статус Blue-Green Deployment ===${NC}"
    echo -e "Активное окружение: ${GREEN}$active${NC}"
    echo ""
    
    echo -e "${YELLOW}Blue окружение:${NC}"
    docker compose -f "$COMPOSE_FILE" ps backend-blue frontend-blue 2>/dev/null || echo "Не запущено"
    echo ""
    
    echo -e "${YELLOW}Green окружение:${NC}"
    docker compose -f "$COMPOSE_FILE" --profile green ps backend-green frontend-green 2>/dev/null || echo "Не запущено"
    echo ""
    
    echo -e "${YELLOW}Nginx:${NC}"
    docker compose -f "$COMPOSE_FILE" ps nginx
}

# Автоматический полный деплой
auto_deploy() {
    local active=$(get_active_color)
    local inactive=$(get_inactive_color)
    
    # Запоминаем время старта
    local start_time=$(date +%s)
    
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  АВТОМАТИЧЕСКИЙ BLUE-GREEN DEPLOYMENT                     ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "Активный: ${GREEN}$active${NC} → Деплой в: ${YELLOW}$inactive${NC}"
    echo -e "Время старта: $(date '+%H:%M:%S')"
    echo ""
    
    # Шаг 0: Git pull
    echo -e "${BLUE}[0/4] Обновление кода из Git...${NC}"
    if [ -d ".git" ]; then
        echo -e "${YELLOW}Выполняется git pull...${NC}"
        git pull
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}✗ Ошибка при git pull${NC}"
            read -p "Продолжить деплой? (y/n) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo -e "${YELLOW}Деплой отменен${NC}"
                exit 1
            fi
        else
            echo -e "${GREEN}✓ Код обновлен${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Git репозиторий не найден, пропускаем git pull${NC}"
    fi
    echo ""
    
    # Шаг 1: Деплой
    echo -e "${BLUE}[1/5] Деплой новой версии...${NC}"
    
    # Определяем тип сборки
    # Можно задать через переменную окружения: FAST_BUILD=1 make bg-auto
    if [ "$FAST_BUILD" = "1" ]; then
        BUILD_TYPE="1"
        echo -e "${GREEN}Используется быстрая сборка (FAST_BUILD=1)${NC}"
    elif [ "$FULL_BUILD" = "1" ]; then
        BUILD_TYPE="2"
        echo -e "${YELLOW}Используется полная пересборка (FULL_BUILD=1)${NC}"
    else
        # Спрашиваем нужна ли полная пересборка
        echo -e "${YELLOW}Тип сборки:${NC}"
        echo "  1) Быстрая (использует кэш, только изменения кода) - рекомендуется"
        echo "  2) Полная (--no-cache, пересборка всего) - если изменились зависимости"
        echo ""
        echo -e "${YELLOW}Совет: Используйте FAST_BUILD=1 make bg-auto для автоматического выбора${NC}"
        echo ""
        read -p "Выберите тип сборки (1/2, Enter=1): " -n 1 -r BUILD_TYPE
        echo ""
    fi
    
    if [ -z "$BUILD_TYPE" ] || [ "$BUILD_TYPE" = "1" ]; then
        echo -e "${YELLOW}Шаг 1.1: Быстрая сборка $inactive окружения (с кэшем)...${NC}"
        docker compose -f "$COMPOSE_FILE" --profile "$inactive" build
    else
        echo -e "${YELLOW}Шаг 1.1: Полная пересборка $inactive окружения (без кэша)...${NC}"
        docker compose -f "$COMPOSE_FILE" --profile "$inactive" build --no-cache
    fi
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Ошибка сборки. Деплой отменен.${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Шаг 1.2: Запуск $inactive окружения...${NC}"
    docker compose -f "$COMPOSE_FILE" --profile "$inactive" up -d
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Ошибка запуска. Деплой отменен.${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Шаг 1.3: Проверка здоровья сервисов...${NC}"
    if ! check_health "backend-$inactive"; then
        echo -e "${RED}✗ Backend не здоров. Откат...${NC}"
        docker compose -f "$COMPOSE_FILE" --profile "$inactive" down
        exit 1
    fi
    
    if ! check_health "frontend-$inactive"; then
        echo -e "${RED}✗ Frontend не здоров. Откат...${NC}"
        docker compose -f "$COMPOSE_FILE" --profile "$inactive" down
        exit 1
    fi
    
    echo -e "${GREEN}✓ Деплой успешен!${NC}"
    echo ""
    
    # Шаг 2: Переключение трафика
    echo -e "${BLUE}[2/5] Переключение трафика...${NC}"
    
    # Определяем порты
    if [ "$inactive" = "green" ]; then
        BACKEND_PORT=$BACKEND_GREEN_PORT
        FRONTEND_PORT=$FRONTEND_GREEN_PORT
    else
        BACKEND_PORT=$BACKEND_BLUE_PORT
        FRONTEND_PORT=$FRONTEND_BLUE_PORT
    fi
    
    # Проверяем наличие скрипта автопереключения и переменных NPM
    if [ -f "scripts/npm-switch.sh" ] && [ -f ".env.prod" ]; then
        # Загружаем переменные из .env.prod
        export $(grep -E '^NPM_' .env.prod | xargs)
        
        if [ -n "$NPM_EMAIL" ] && [ -n "$NPM_PASSWORD" ]; then
            echo ""
            echo -e "${YELLOW}Попытка автоматического переключения NPM...${NC}"
            
            if bash scripts/npm-switch.sh "$BACKEND_PORT" "$FRONTEND_PORT"; then
                echo -e "${GREEN}✓ NPM переключен автоматически!${NC}"
                AUTO_SWITCHED=true
            else
                echo -e "${RED}✗ Автоматическое переключение не удалось${NC}"
                echo -e "${YELLOW}Переключите вручную в NPM${NC}"
                AUTO_SWITCHED=false
            fi
        else
            echo -e "${YELLOW}⚠ NPM credentials не найдены в .env.prod${NC}"
            AUTO_SWITCHED=false
        fi
    else
        AUTO_SWITCHED=false
    fi
    
    # Сохраняем для отката
    echo "$active" > ".deployment-state.backup"
    
    # Если автопереключение не сработало, показываем инструкцию и запрашиваем подтверждение
    if [ "$AUTO_SWITCHED" != "true" ]; then
        echo ""
        echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║  ПЕРЕКЛЮЧИТЕ ТРАФИК В NGINX PROXY MANAGER                 ║${NC}"
        echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${GREEN}Backend API (crm.archeo.kz/api):${NC}"
        echo -e "  Forward Port: ${RED}старый${NC} → ${GREEN}$BACKEND_PORT${NC}"
        echo ""
        echo -e "${GREEN}Frontend (crm.archeo.kz):${NC}"
        echo -e "  Forward Port: ${RED}старый${NC} → ${GREEN}$FRONTEND_PORT${NC}"
        echo ""
        echo -e "${YELLOW}Тестирование (до переключения):${NC}"
        echo -e "  Backend:  http://localhost:$BACKEND_PORT/api/health/"
        echo -e "  Frontend: http://localhost:$FRONTEND_PORT/"
        echo ""
        
        read -p "Переключили трафик в NPM? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Деплой приостановлен. Новое окружение работает на портах $BACKEND_PORT/$FRONTEND_PORT${NC}"
            echo -e "${YELLOW}Для продолжения: ./deploy-blue-green.sh switch${NC}"
            echo -e "${YELLOW}Для отката: docker compose -f $COMPOSE_FILE --profile $inactive down${NC}"
            exit 0
        fi
    else
        echo ""
        echo -e "${GREEN}✓ Трафик переключен автоматически${NC}"
    fi
    
    # Шаг 3: Проверка после переключения
    echo ""
    echo -e "${BLUE}[3/5] Проверка работы сайта...${NC}"
    echo -e "${YELLOW}Откройте https://crm.archeo.kz и проверьте работу${NC}"
    echo ""
    
    read -p "Сайт работает нормально? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${RED}Обнаружены проблемы. Выполняется откат...${NC}"
        
        # Определяем порты для отката
        if [ "$active" = "blue" ]; then
            ROLLBACK_BACKEND_PORT=$BACKEND_BLUE_PORT
            ROLLBACK_FRONTEND_PORT=$FRONTEND_BLUE_PORT
        else
            ROLLBACK_BACKEND_PORT=$BACKEND_GREEN_PORT
            ROLLBACK_FRONTEND_PORT=$FRONTEND_GREEN_PORT
        fi
        
        echo ""
        echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════╗${NC}"
        echo -e "${YELLOW}║  ВЕРНИТЕ ПОРТЫ В NGINX PROXY MANAGER                      ║${NC}"
        echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${GREEN}Backend API:${NC} Forward Port → ${GREEN}$ROLLBACK_BACKEND_PORT${NC}"
        echo -e "${GREEN}Frontend:${NC}    Forward Port → ${GREEN}$ROLLBACK_FRONTEND_PORT${NC}"
        echo ""
        
        read -p "Вернули порты? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -f ".deployment-state.backup"
            echo -e "${GREEN}✓ Откат выполнен${NC}"
            echo -e "${YELLOW}Новое окружение все еще запущено для отладки${NC}"
            echo -e "${YELLOW}Для остановки: docker compose -f $COMPOSE_FILE --profile $inactive down${NC}"
        fi
        exit 1
    fi
    
    # Шаг 4: Очистка
    echo ""
    echo -e "${BLUE}[4/5] Очистка старого окружения...${NC}"
    
    # ВАЖНО: Сохраняем старое окружение ДО переключения активного цвета
    local old_environment="$active"
    
    # Теперь переключаем активный цвет
    set_active_color "$inactive"
    rm -f ".deployment-state.backup"
    
    echo -e "${YELLOW}Ожидание 30 секунд перед остановкой старого окружения...${NC}"
    echo -e "${YELLOW}(для возможности быстрого отката)${NC}"
    sleep 30
    
    echo -e "${YELLOW}Остановка $old_environment окружения...${NC}"
    docker compose -f "$COMPOSE_FILE" --profile "$old_environment" down
    
    # Вычисляем время деплоя
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ ДЕПЛОЙ ЗАВЕРШЕН УСПЕШНО!                              ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "Активное окружение: ${GREEN}$inactive${NC}"
    echo -e "Порты: Backend ${GREEN}$BACKEND_PORT${NC}, Frontend ${GREEN}$FRONTEND_PORT${NC}"
    echo ""
    echo -e "${YELLOW}⏱️  Время деплоя: ${GREEN}${minutes} мин ${seconds} сек${NC}"
    echo -e "Время завершения: $(date '+%H:%M:%S')"
    echo ""
}

# Главное меню
case "${1:-}" in
    auto)
        auto_deploy
        ;;
    deploy)
        deploy
        ;;
    switch)
        switch
        ;;
    rollback)
        rollback
        ;;
    cleanup)
        cleanup
        ;;
    status)
        status
        ;;
    *)
        echo "Использование: $0 {auto|deploy|switch|rollback|cleanup|status}"
        echo ""
        echo "Команды:"
        echo "  auto     - 🚀 АВТОМАТИЧЕСКИЙ полный деплой (deploy + switch + cleanup)"
        echo "  deploy   - Деплой новой версии в неактивное окружение"
        echo "  switch   - Переключить трафик на новое окружение (инструкция для NPM)"
        echo "  rollback - Откатить к предыдущей версии (инструкция для NPM)"
        echo "  cleanup  - Остановить неактивное окружение"
        echo "  status   - Показать статус окружений"
        echo ""
        echo "Порты окружений:"
        echo "  Blue:  Backend=$BACKEND_BLUE_PORT, Frontend=$FRONTEND_BLUE_PORT"
        echo "  Green: Backend=$BACKEND_GREEN_PORT, Frontend=$FRONTEND_GREEN_PORT"
        exit 1
        ;;
esac
