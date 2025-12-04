.PHONY: help dev prod build-dev build-prod up-dev up-prod down-dev down-prod logs-dev logs-prod clean migrate createsuperuser

# Определение команды docker-compose
DOCKER_COMPOSE := $(shell command -v docker-compose 2> /dev/null)
ifndef DOCKER_COMPOSE
	DOCKER_COMPOSE := docker compose
endif

# Настройки деплоя
PROD_HOST := 89.207.255.13
PROD_USER := root
PROD_PATH := /root/crm-medical
SSH_KEY := ~/.ssh/id_rsa

# Цвета для вывода
GREEN=\033[0;32m
YELLOW=\033[1;33m
RED=\033[0;31m
NC=\033[0m # No Color

help: ## Показать справку
	@echo "$(GREEN)CRM Medical Platform - Makefile команды$(NC)"
	@echo ""
	@echo "$(YELLOW)Development команды:$(NC)"
	@echo "  make dev              - Запустить проект в dev режиме"
	@echo "  make build-dev        - Собрать образы для dev"
	@echo "  make up-dev           - Запустить dev контейнеры"
	@echo "  make down-dev         - Остановить dev контейнеры"
	@echo "  make logs-dev         - Показать логи dev"
	@echo ""
	@echo "$(YELLOW)Production команды:$(NC)"
	@echo "  make prod             - Запустить проект в prod режиме"
	@echo "  make build-prod       - Собрать образы для prod"
	@echo "  make up-prod          - Запустить prod контейнеры"
	@echo "  make down-prod        - Остановить prod контейнеры"
	@echo "  make logs-prod        - Показать логи prod"
	@echo ""
	@echo "$(YELLOW)Утилиты:$(NC)"
	@echo "  make migrate          - Применить миграции"
	@echo "  make createsuperuser  - Создать суперпользователя"
	@echo "  make clean            - Очистить все контейнеры и volumes"
	@echo "  make shell-backend    - Войти в shell backend контейнера"
	@echo "  make shell-frontend   - Войти в shell frontend контейнера"
	@echo ""
	@echo "$(YELLOW)Деплой команды:$(NC)"
	@echo "  make deploy           - Полный деплой (commit + push + update на сервере)"
	@echo "  make deploy-quick     - Быстрый деплой (без rebuild образов)"
	@echo "  make git-push         - Только commit и push"
	@echo "  make server-update    - Только обновление на сервере"
	@echo "  make server-logs      - Показать логи с prod сервера"
	@echo "  make server-status    - Статус контейнеров на prod сервере"

# Development команды
dev: build-dev up-dev ## Полный запуск в dev режиме

build-dev: ## Собрать dev образы
	@echo "$(GREEN)Сборка dev образов...$(NC)"
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml build

up-dev: ## Запустить dev контейнеры
	@echo "$(GREEN)Запуск dev контейнеров...$(NC)"
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml up -d
	@echo "$(GREEN)Dev сервисы запущены!$(NC)"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:8000"

down-dev: ## Остановить dev контейнеры
	@echo "$(YELLOW)Остановка dev контейнеров...$(NC)"
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml down

logs-dev: ## Показать логи dev
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml logs -f

# Production команды
prod: build-prod up-prod ## Полный запуск в prod режиме

build-prod: ## Собрать prod образы
	@echo "$(GREEN)Сборка prod образов...$(NC)"
	$(DOCKER_COMPOSE) -f docker-compose.yml build

up-prod: ## Запустить prod контейнеры
	@echo "$(GREEN)Запуск prod контейнеров...$(NC)"
	$(DOCKER_COMPOSE) -f docker-compose.yml up -d
	@echo "$(GREEN)Prod сервисы запущены!$(NC)"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:8000"

down-prod: ## Остановить prod контейнеры
	@echo "$(YELLOW)Остановка prod контейнеров...$(NC)"
	$(DOCKER_COMPOSE) -f docker-compose.yml down

logs-prod: ## Показать логи prod
	$(DOCKER_COMPOSE) -f docker-compose.yml logs -f

# Утилиты
migrate: ## Применить миграции Django
	@echo "$(GREEN)Применение миграций...$(NC)"
	$(DOCKER_COMPOSE) exec backend python manage.py makemigrations
	$(DOCKER_COMPOSE) exec backend python manage.py migrate

createsuperuser: ## Создать суперпользователя Django
	@echo "$(GREEN)Создание суперпользователя...$(NC)"
	$(DOCKER_COMPOSE) exec backend python manage.py createsuperuser

shell-backend: ## Войти в shell backend контейнера
	$(DOCKER_COMPOSE) exec backend /bin/sh

shell-frontend: ## Войти в shell frontend контейнера
	$(DOCKER_COMPOSE) exec frontend /bin/sh

clean: ## Очистить все контейнеры и volumes
	@echo "$(YELLOW)Очистка контейнеров и volumes...$(NC)"
	$(DOCKER_COMPOSE) -f docker-compose.yml down -v
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml down -v
	@echo "$(GREEN)Очистка завершена!$(NC)"

# Дополнительные команды
restart-dev: down-dev up-dev ## Перезапустить dev

restart-prod: down-prod up-prod ## Перезапустить prod

status: ## Показать статус контейнеров
	@echo "$(GREEN)Статус контейнеров:$(NC)"
	$(DOCKER_COMPOSE) ps

# ============================================
# ДЕПЛОЙ КОМАНДЫ
# ============================================

git-push: ## Commit и push изменений
	@echo "$(GREEN)Коммит и push изменений...$(NC)"
	@git add .
	@read -p "Введите сообщение коммита: " msg; \
	git commit -m "$$msg" || echo "$(YELLOW)Нет изменений для коммита$(NC)"
	@git push origin main || git push origin master
	@echo "$(GREEN)Изменения отправлены в репозиторий!$(NC)"

server-update: ## Обновить код на prod сервере
	@echo "$(GREEN)Подключение к серверу и обновление...$(NC)"
	ssh -i $(SSH_KEY) $(PROD_USER)@$(PROD_HOST) "\
		cd $(PROD_PATH) && \
		echo '$(YELLOW)Получение последних изменений...$(NC)' && \
		git pull origin main || git pull origin master && \
		echo '$(YELLOW)Пересборка образов...$(NC)' && \
		docker compose -f docker-compose.yml build && \
		echo '$(YELLOW)Перезапуск контейнеров...$(NC)' && \
		docker compose -f docker-compose.yml up -d && \
		echo '$(GREEN)Деплой завершен!$(NC)'"

server-update-quick: ## Быстрое обновление без rebuild
	@echo "$(GREEN)Быстрое обновление на сервере...$(NC)"
	ssh -i $(SSH_KEY) $(PROD_USER)@$(PROD_HOST) "\
		cd $(PROD_PATH) && \
		git pull origin main || git pull origin master && \
		docker compose -f docker-compose.yml restart && \
		echo '$(GREEN)Быстрое обновление завершено!$(NC)'"

deploy: git-push server-update ## Полный деплой (commit + push + rebuild на сервере)
	@echo "$(GREEN)================================$(NC)"
	@echo "$(GREEN)Деплой успешно завершен!$(NC)"
	@echo "$(GREEN)================================$(NC)"

deploy-quick: git-push server-update-quick ## Быстрый деплой без rebuild
	@echo "$(GREEN)================================$(NC)"
	@echo "$(GREEN)Быстрый деплой завершен!$(NC)"
	@echo "$(GREEN)================================$(NC)"

server-logs: ## Показать логи с prod сервера
	@echo "$(GREEN)Логи с prod сервера:$(NC)"
	ssh -i $(SSH_KEY) $(PROD_USER)@$(PROD_HOST) "cd $(PROD_PATH) && docker compose -f docker-compose.yml logs -f"

server-status: ## Статус контейнеров на prod сервере
	@echo "$(GREEN)Статус контейнеров на prod:$(NC)"
	ssh -i $(SSH_KEY) $(PROD_USER)@$(PROD_HOST) "cd $(PROD_PATH) && docker compose ps"

server-shell: ## SSH подключение к серверу
	@echo "$(GREEN)Подключение к серверу...$(NC)"
	ssh -i $(SSH_KEY) $(PROD_USER)@$(PROD_HOST)

server-restart: ## Перезапустить контейнеры на сервере
	@echo "$(YELLOW)Перезапуск контейнеров на сервере...$(NC)"
	ssh -i $(SSH_KEY) $(PROD_USER)@$(PROD_HOST) "cd $(PROD_PATH) && docker compose -f docker-compose.yml restart"
	@echo "$(GREEN)Контейнеры перезапущены!$(NC)"
