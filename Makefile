.PHONY: help dev prod build-dev build-prod up-dev up-prod down-dev down-prod logs-dev logs-prod clean migrate createsuperuser

# Определение команды docker-compose
DOCKER_COMPOSE := $(shell command -v docker-compose 2> /dev/null)
ifndef DOCKER_COMPOSE
	DOCKER_COMPOSE := docker compose
endif

# Настройки деплоя
PROD_HOST := 89.207.255.13
PROD_USER := root
PROD_PATH := /root/projects/CRM
SSH_KEY := ~/.ssh/id_rsa

# Colors (disabled on Windows due to encoding issues)
ifeq ($(OS),Windows_NT)
	GREEN=
	YELLOW=
	RED=
	NC=
else
	GREEN=\033[0;32m
	YELLOW=\033[1;33m
	RED=\033[0;31m
	NC=\033[0m
endif

help: ## Show help
	@echo "CRM Medical Platform - Makefile commands"
	@echo ""
	@echo "WINDOWS USERS: Use .bat scripts instead of make!"
	@echo "  deploy.bat, deploy-quick.bat, server-logs.bat"
	@echo ""
	@echo "Development:"
	@echo "  make dev              - Start dev environment"
	@echo "  make build-dev        - Build dev images"
	@echo "  make up-dev           - Start dev containers"
	@echo "  make down-dev         - Stop dev containers"
	@echo "  make logs-dev         - Show dev logs"
	@echo ""
	@echo "Production:"
	@echo "  make prod             - Start prod environment"
	@echo "  make build-prod       - Build prod images"
	@echo "  make up-prod          - Start prod containers"
	@echo "  make down-prod        - Stop prod containers"
	@echo "  make logs-prod        - Show prod logs"
	@echo ""
	@echo "Utils:"
	@echo "  make migrate          - Apply migrations"
	@echo "  make createsuperuser  - Create superuser"
	@echo "  make clean            - Clean containers and volumes"
	@echo "  make shell-backend    - Backend shell"
	@echo "  make shell-frontend   - Frontend shell"
	@echo ""
	@echo "Deploy (Linux/Mac only - Windows use .bat):"
	@echo "  make deploy           - Full deploy"
	@echo "  make deploy-quick     - Quick deploy"
	@echo "  make git-push         - Git commit and push"
	@echo "  make server-update    - Update on server"
	@echo "  make server-logs      - Show server logs"
	@echo "  make server-status    - Server containers status"

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

git-push: ## Commit and push changes
	@echo "Committing and pushing changes..."
	@git add .
	@git commit -m "Auto deploy" || echo "No changes to commit"
	@git push origin main || git push origin master
	@echo "Changes pushed to repository!"

server-update: ## Update code on prod server
	@echo "Connecting to server and updating..."
	@ssh -i $(SSH_KEY) $(PROD_USER)@$(PROD_HOST) "\
		cd $(PROD_PATH) && \
		echo 'Pulling latest changes...' && \
		git pull origin main || git pull origin master && \
		echo 'Building images...' && \
		docker compose -f docker-compose.yml build && \
		echo 'Restarting containers...' && \
		docker compose -f docker-compose.yml up -d && \
		echo 'Deploy completed!'"

server-update-quick: ## Quick update without rebuild
	@echo "Quick update on server..."
	@ssh -i $(SSH_KEY) $(PROD_USER)@$(PROD_HOST) "\
		cd $(PROD_PATH) && \
		git pull origin main || git pull origin master && \
		docker compose -f docker-compose.yml restart && \
		echo 'Quick update completed!'"

deploy: git-push server-update ## Full deploy (commit + push + rebuild)
	@echo "================================"
	@echo "Deploy completed successfully!"
	@echo "================================"

deploy-quick: git-push server-update-quick ## Quick deploy without rebuild
	@echo "================================"
	@echo "Quick deploy completed!"
	@echo "================================"

server-logs: ## Show logs from prod server
	@echo "Logs from prod server:"
	@ssh -i $(SSH_KEY) $(PROD_USER)@$(PROD_HOST) "cd $(PROD_PATH) && docker compose -f docker-compose.yml logs -f"

server-status: ## Server containers status
	@echo "Containers status on prod:"
	@ssh -i $(SSH_KEY) $(PROD_USER)@$(PROD_HOST) "cd $(PROD_PATH) && docker compose ps"

server-shell: ## SSH connection to server
	@echo "Connecting to server..."
	@ssh -i $(SSH_KEY) $(PROD_USER)@$(PROD_HOST)

server-restart: ## Restart containers on server
	@echo "Restarting containers on server..."
	@ssh -i $(SSH_KEY) $(PROD_USER)@$(PROD_HOST) "cd $(PROD_PATH) && docker compose -f docker-compose.yml restart"
	@echo "Containers restarted!"
