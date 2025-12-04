.PHONY: help dev prod build-dev build-prod up-dev up-prod down-dev down-prod logs-dev logs-prod clean migrate-dev migrate-prod createsuperuser-dev createsuperuser-prod shell-backend-dev shell-frontend-dev shell-backend-prod shell-frontend-prod restart-dev restart-prod status-dev status-prod

# Определение команды docker-compose
DOCKER_COMPOSE := $(shell command -v docker-compose 2> /dev/null)
ifndef DOCKER_COMPOSE
	DOCKER_COMPOSE := docker compose
endif

# Цвета для вывода (отключены на Windows из-за проблем с кодировкой)
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

help: ## Показать справку
ifeq ($(OS),Windows_NT)
	@chcp 65001 >nul 2>&1
endif
	@echo "$(GREEN)CRM Medical Platform - Команды Makefile$(NC)"
	@echo ""
ifeq ($(OS),Windows_NT)
	@echo "$(YELLOW)ПОЛЬЗОВАТЕЛИ WINDOWS: Используйте .bat скрипты вместо make!$(NC)"
	@echo ""
endif
	@echo "$(YELLOW)Команды для Development:$(NC)"
	@echo "  make dev              - Запустить проект в dev режиме"
	@echo "  make build-dev        - Собрать dev образы"
	@echo "  make up-dev           - Запустить dev контейнеры"
	@echo "  make down-dev         - Остановить dev контейнеры"
	@echo "  make logs-dev         - Показать логи dev"
	@echo ""
	@echo "$(YELLOW)Команды для Production:$(NC)"
	@echo "  make prod             - Запустить проект в prod режиме"
	@echo "  make build-prod       - Собрать prod образы"
	@echo "  make up-prod          - Запустить prod контейнеры"
	@echo "  make down-prod        - Остановить prod контейнеры"
	@echo "  make logs-prod        - Показать логи prod"
	@echo ""
	@echo "$(YELLOW)Утилиты (Development):$(NC)"
	@echo "  make migrate-dev          - Применить миграции (dev)"
	@echo "  make createsuperuser-dev  - Создать суперпользователя (dev)"
	@echo "  make shell-backend-dev    - Войти в shell backend (dev)"
	@echo "  make shell-frontend-dev   - Войти в shell frontend (dev)"
	@echo "  make status-dev           - Статус контейнеров (dev)"
	@echo ""
	@echo "$(YELLOW)Утилиты (Production):$(NC)"
	@echo "  make migrate-prod         - Применить миграции (prod)"
	@echo "  make createsuperuser-prod - Создать суперпользователя (prod)"
	@echo "  make shell-backend-prod   - Войти в shell backend (prod)"
	@echo "  make shell-frontend-prod  - Войти в shell frontend (prod)"
	@echo "  make status-prod          - Статус контейнеров (prod)"
	@echo ""
	@echo "$(YELLOW)Общие утилиты:$(NC)"
	@echo "  make clean            - Очистить все контейнеры и volumes"
	@echo "  make restart-dev      - Перезапустить dev"
	@echo "  make restart-prod     - Перезапустить prod"

# Development команды
dev: build-dev up-dev ## Полный запуск в dev режиме

build-dev: ## Собрать dev образы
	@echo "$(GREEN)Сборка dev образов...$(NC)"
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml build

up-dev: ## Запустить dev контейнеры
	@echo "$(GREEN)Запуск dev контейнеров...$(NC)"
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml up -d
	@echo "$(GREEN)Dev сервисы запущены!$(NC)"
	@echo "Frontend: http://localhost:3001"
	@echo "Backend: http://localhost:8001"

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

# Утилиты для Development
migrate-dev: ## Применить миграции Django (dev)
	@echo "$(GREEN)Применение миграций (dev)...$(NC)"
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml exec backend python manage.py makemigrations
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml exec backend python manage.py migrate

createsuperuser-dev: ## Создать суперпользователя Django (dev)
	@echo "$(GREEN)Создание суперпользователя (dev)...$(NC)"
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml exec backend python manage.py createsuperuser

shell-backend-dev: ## Войти в shell backend контейнера (dev)
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml exec backend /bin/sh

shell-frontend-dev: ## Войти в shell frontend контейнера (dev)
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml exec frontend /bin/sh

status-dev: ## Показать статус контейнеров (dev)
	@echo "$(GREEN)Статус dev контейнеров:$(NC)"
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml ps

# Утилиты для Production
migrate-prod: ## Применить миграции Django (prod)
	@echo "$(GREEN)Применение миграций (prod)...$(NC)"
	$(DOCKER_COMPOSE) -f docker-compose.yml exec backend python manage.py makemigrations
	$(DOCKER_COMPOSE) -f docker-compose.yml exec backend python manage.py migrate

createsuperuser-prod: ## Создать суперпользователя Django (prod)
	@echo "$(GREEN)Создание суперпользователя (prod)...$(NC)"
	$(DOCKER_COMPOSE) -f docker-compose.yml exec backend python manage.py createsuperuser

shell-backend-prod: ## Войти в shell backend контейнера (prod)
	$(DOCKER_COMPOSE) -f docker-compose.yml exec backend /bin/sh

shell-frontend-prod: ## Войти в shell frontend контейнера (prod)
	$(DOCKER_COMPOSE) -f docker-compose.yml exec frontend /bin/sh

status-prod: ## Показать статус контейнеров (prod)
	@echo "$(GREEN)Статус prod контейнеров:$(NC)"
	$(DOCKER_COMPOSE) -f docker-compose.yml ps

clean: ## Очистить все контейнеры и volumes
	@echo "$(YELLOW)Очистка контейнеров и volumes...$(NC)"
	$(DOCKER_COMPOSE) -f docker-compose.yml down -v
	$(DOCKER_COMPOSE) -f docker-compose.dev.yml down -v
	@echo "$(GREEN)Очистка завершена!$(NC)"

# Дополнительные команды
restart-dev: down-dev up-dev ## Перезапустить dev

restart-prod: down-prod up-prod ## Перезапустить prod
