#!/bin/bash

# Скрипт для автоматического переключения портов в Nginx Proxy Manager через API

# Загружаем переменные из .env.prod если не установлены
if [ -z "$NPM_HOST" ] && [ -f ".env.prod" ]; then
    export $(grep -E '^NPM_' .env.prod | xargs)
fi

# Конфигурация NPM API (с дефолтными значениями)
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
    local frontend_port=$2
    local backend_port=$3
    
    echo -e "${YELLOW}Обновление портов для Proxy Host ID: $host_id...${NC}"
    
    # Получаем текущую конфигурацию
    local config=$(curl -s -X GET "$NPM_HOST/api/nginx/proxy-hosts/$host_id" \
        -H "Authorization: Bearer $TOKEN")
    
    # Удаляем поля которые NPM не принимает при обновлении
    config=$(echo "$config" | jq 'del(.id, .created_on, .modified_on, .owner_user_id, .meta, .certificate_id, .ssl_forced, .hsts_enabled, .hsts_subdomains, .http2_support)')
    
    # Обновляем frontend порт
    config=$(echo "$config" | jq ".forward_port = $frontend_port")
    
    # Обновляем backend порт в locations
    if echo "$config" | jq -e '.locations[0]' > /dev/null 2>&1; then
        config=$(echo "$config" | jq ".locations[0].forward_port = $backend_port")
        
        # Проверяем наличие advanced_config и обновляем порт в нем
        if echo "$config" | jq -e '.locations[0].advanced_config' > /dev/null 2>&1; then
            local advanced_config=$(echo "$config" | jq -r '.locations[0].advanced_config')
            if [ -n "$advanced_config" ] && [ "$advanced_config" != "null" ]; then
                # Заменяем старый порт на новый в advanced_config
                # Ищем паттерн :XXXX/ где XXXX - это порт
                local new_advanced_config=$(echo "$advanced_config" | sed -E "s/:([0-9]+)\/api\//:$backend_port\/api\//g")
                config=$(echo "$config" | jq ".locations[0].advanced_config = \"$new_advanced_config\"")
                echo -e "${GREEN}✓ Обновлен advanced_config с портом: $backend_port${NC}"
            fi
        fi
        
        echo -e "${GREEN}✓ Обновлен backend location порт: $backend_port${NC}"
    fi
    
    # Отправляем обновление
    local result=$(curl -s -X PUT "$NPM_HOST/api/nginx/proxy-hosts/$host_id" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$config")
    
    if echo "$result" | jq -e '.id' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend порт обновлен: $frontend_port${NC}"
        return 0
    else
        echo -e "${RED}✗ Ошибка обновления${NC}"
        echo "$result" | jq '.'
        return 1
    fi
}

# Переключение на указанные порты
switch_ports() {
    local backend_port=$1
    local frontend_port=$2
    
    echo -e "${YELLOW}Поиск proxy host для crm.archeo.kz...${NC}"
    
    # Ищем proxy host с locations (там и frontend и backend)
    local hosts=$(curl -s -X GET "$NPM_HOST/api/nginx/proxy-hosts" \
        -H "Authorization: Bearer $TOKEN")
    
    local host_id=$(echo "$hosts" | jq -r '.[] | select(.domain_names[] | contains("crm.archeo.kz")) | .id')
    
    if [ -z "$host_id" ]; then
        echo -e "${RED}✗ Proxy host для crm.archeo.kz не найден${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✓ Найден Proxy Host ID: $host_id${NC}"
    
    # Обновляем оба порта
    if update_proxy_port "$host_id" "$frontend_port" "$backend_port"; then
        echo ""
        echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║  ✓ Переключение завершено успешно!                       ║${NC}"
        echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "Frontend: ${GREEN}http://82.115.48.40:$frontend_port${NC}"
        echo -e "Backend:  ${GREEN}http://82.115.48.40:$backend_port${NC}"
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
