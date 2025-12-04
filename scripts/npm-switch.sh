#!/bin/bash

# Скрипт для автоматического переключения портов в Nginx Proxy Manager через API

# Конфигурация NPM API
NPM_HOST="${NPM_HOST:-http://localhost:81}"
NPM_EMAIL="${NPM_EMAIL:-admin@example.com}"
NPM_PASSWORD="${NPM_PASSWORD:-changeme}"

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Получаем токен авторизации
get_token() {
    echo -e "${YELLOW}Авторизация в NPM...${NC}"
    
    TOKEN=$(curl -s -X POST "$NPM_HOST/api/tokens" \
        -H "Content-Type: application/json" \
        -d "{\"identity\":\"$NPM_EMAIL\",\"secret\":\"$NPM_PASSWORD\"}" \
        | jq -r '.token')
    
    if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
        echo -e "${RED}✗ Ошибка авторизации в NPM${NC}"
        echo -e "${YELLOW}Проверьте переменные NPM_EMAIL и NPM_PASSWORD${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✓ Авторизация успешна${NC}"
    return 0
}

# Получаем список proxy hosts
get_proxy_hosts() {
    curl -s -X GET "$NPM_HOST/api/nginx/proxy-hosts" \
        -H "Authorization: Bearer $TOKEN" \
        | jq -r '.[] | "\(.id)|\(.domain_names[0])|\(.forward_port)"'
}

# Обновляем порт для proxy host
update_proxy_port() {
    local host_id=$1
    local new_port=$2
    local domain=$3
    
    echo -e "${YELLOW}Обновление $domain → порт $new_port...${NC}"
    
    # Получаем текущую конфигурацию
    local config=$(curl -s -X GET "$NPM_HOST/api/nginx/proxy-hosts/$host_id" \
        -H "Authorization: Bearer $TOKEN")
    
    # Обновляем порт
    local updated_config=$(echo "$config" | jq ".forward_port = $new_port")
    
    # Отправляем обновление
    local result=$(curl -s -X PUT "$NPM_HOST/api/nginx/proxy-hosts/$host_id" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$updated_config")
    
    if echo "$result" | jq -e '.id' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $domain обновлен на порт $new_port${NC}"
        return 0
    else
        echo -e "${RED}✗ Ошибка обновления $domain${NC}"
        return 1
    fi
}

# Переключение на указанные порты
switch_ports() {
    local backend_port=$1
    local frontend_port=$2
    
    echo -e "${YELLOW}Поиск proxy hosts...${NC}"
    
    local backend_id=""
    local frontend_id=""
    
    # Ищем нужные proxy hosts
    while IFS='|' read -r id domain port; do
        if [[ "$domain" == *"crm.archeo.kz"* ]]; then
            # Проверяем по location или другим признакам
            local full_config=$(curl -s -X GET "$NPM_HOST/api/nginx/proxy-hosts/$id" \
                -H "Authorization: Bearer $TOKEN")
            
            # Если есть /api в locations - это backend
            if echo "$full_config" | jq -e '.locations[] | select(.path == "/api")' > /dev/null 2>&1; then
                backend_id=$id
                echo -e "${GREEN}Найден Backend API: $domain (ID: $id)${NC}"
            else
                frontend_id=$id
                echo -e "${GREEN}Найден Frontend: $domain (ID: $id)${NC}"
            fi
        fi
    done < <(get_proxy_hosts)
    
    # Обновляем порты
    local success=true
    
    if [ -n "$backend_id" ]; then
        update_proxy_port "$backend_id" "$backend_port" "Backend API" || success=false
    else
        echo -e "${YELLOW}⚠ Backend proxy host не найден${NC}"
    fi
    
    if [ -n "$frontend_id" ]; then
        update_proxy_port "$frontend_id" "$frontend_port" "Frontend" || success=false
    else
        echo -e "${YELLOW}⚠ Frontend proxy host не найден${NC}"
    fi
    
    if [ "$success" = true ]; then
        echo -e "${GREEN}✓ Все порты успешно переключены${NC}"
        return 0
    else
        return 1
    fi
}

# Главная функция
main() {
    local backend_port=$1
    local frontend_port=$2
    
    if [ -z "$backend_port" ] || [ -z "$frontend_port" ]; then
        echo "Использование: $0 <backend_port> <frontend_port>"
        echo "Пример: $0 8002 3002"
        exit 1
    fi
    
    echo -e "${YELLOW}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  Автоматическое переключение NPM                         ║${NC}"
    echo -e "${YELLOW}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Проверяем наличие jq
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}✗ Требуется установить jq${NC}"
        echo -e "${YELLOW}Ubuntu/Debian: sudo apt-get install jq${NC}"
        echo -e "${YELLOW}Mac: brew install jq${NC}"
        exit 1
    fi
    
    # Авторизуемся
    if ! get_token; then
        exit 1
    fi
    
    echo ""
    
    # Переключаем порты
    if switch_ports "$backend_port" "$frontend_port"; then
        echo ""
        echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║  ✓ Переключение завершено успешно!                       ║${NC}"
        echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
        exit 0
    else
        echo ""
        echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║  ✗ Ошибка при переключении                               ║${NC}"
        echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
        exit 1
    fi
}

# Запуск
main "$@"
