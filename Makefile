.PHONY: help dev prod build-dev build-prod up-dev up-prod down-dev down-prod logs-dev logs-prod clean migrate createsuperuser

# Цвета для вывода
GREEN=\033[0;32m
YELLOW=\033[1;33m
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

# Development команды
dev: build-dev up-dev ## Полный запуск в dev режиме

build-dev: ## Собрать dev образы
	@echo "$(GREEN)Сборка dev образов...$(NC)"
	docker-compose -f docker-compose.dev.yml build

up-dev: ## Запустить dev контейнеры
	@echo "$(GREEN)Запуск dev контейнеров...$(NC)"
	docker-compose -f docker-compose.dev.yml up -d
	@echo "$(GREEN)Dev сервисы запущены!$(NC)"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:8000"

down-dev: ## Остановить dev контейнеры
	@echo "$(YELLOW)Остановка dev контейнеров...$(NC)"
	docker-compose -f docker-compose.dev.yml down

logs-dev: ## Показать логи dev
	docker-compose -f docker-compose.dev.yml logs -f

# Production команды
prod: build-prod up-prod ## Полный запуск в prod режиме

build-prod: ## Собрать prod образы
	@echo "$(GREEN)Сборка prod образов...$(NC)"
	docker-compose -f docker-compose.yml build

up-prod: ## Запустить prod контейнеры
	@echo "$(GREEN)Запуск prod контейнеров...$(NC)"
	docker-compose -f docker-compose.yml up -d
	@echo "$(GREEN)Prod сервисы запущены!$(NC)"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:8000"

down-prod: ## Остановить prod контейнеры
	@echo "$(YELLOW)Остановка prod контейнеров...$(NC)"
	docker-compose -f docker-compose.yml down

logs-prod: ## Показать логи prod
	docker-compose -f docker-compose.yml logs -f

# Утилиты
migrate: ## Применить миграции Django
	@echo "$(GREEN)Применение миграций...$(NC)"
	docker-compose exec backend python manage.py makemigrations
	docker-compose exec backend python manage.py migrate

createsuperuser: ## Создать суперпользователя Django
	@echo "$(GREEN)Создание суперпользователя...$(NC)"
	docker-compose exec backend python manage.py createsuperuser

shell-backend: ## Войти в shell backend контейнера
	docker-compose exec backend /bin/sh

shell-frontend: ## Войти в shell frontend контейнера
	docker-compose exec frontend /bin/sh

clean: ## Очистить все контейнеры и volumes
	@echo "$(YELLOW)Очистка контейнеров и volumes...$(NC)"
	docker-compose -f docker-compose.yml down -v
	docker-compose -f docker-compose.dev.yml down -v
	@echo "$(GREEN)Очистка завершена!$(NC)"

# Дополнительные команды
restart-dev: down-dev up-dev ## Перезапустить dev

restart-prod: down-prod up-prod ## Перезапустить prod

status: ## Показать статус контейнеров
	@echo "$(GREEN)Статус контейнеров:$(NC)"
	docker-compose ps
