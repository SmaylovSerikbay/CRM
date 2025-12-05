# Git Workflow для команды (2 человека)

## Основные правила для избежания конфликтов

### 1. Всегда начинайте с обновления

**Перед началом работы:**
```bash
git pull origin main
```

**Перед коммитом:**
```bash
git pull origin main
```

### 2. Используйте feature-ветки

Вместо работы напрямую в `main`, создавайте отдельные ветки для каждой задачи:

```bash
# Создать и переключиться на новую ветку
git checkout -b feature/employee-details

# Работаете над задачей...

# Коммитите изменения
git add .
git commit -m "Add employee details modal"

# Обновляете main и вливаете изменения
git checkout main
git pull origin main
git merge feature/employee-details

# Пушите в main
git push origin main

# Удаляете ветку (опционально)
git branch -d feature/employee-details
```

### 3. Разделение зон ответственности

**Рекомендуемое разделение:**

**Разработчик 1:**
- Frontend: `frontend/app/dashboard/clinic/*`
- Backend: `backend/api/views.py` (clinic endpoints)
- Документация: `docs/CLINIC_*.md`

**Разработчик 2:**
- Frontend: `frontend/app/dashboard/employer/*`
- Backend: `backend/api/serializers.py`
- Документация: `docs/EMPLOYER_*.md`

**Общие файлы (требуют координации):**
- `frontend/lib/store/*`
- `frontend/lib/api/*`
- `backend/api/models.py`
- `docker-compose.yml`

### 4. Коммуникация перед изменением общих файлов

Перед изменением общих файлов:
1. Напишите коллеге в чат
2. Убедитесь, что он не работает с этим файлом
3. Сделайте изменения быстро
4. Сразу закоммитьте и запушьте

### 5. Частые коммиты и пуши

**Плохо:**
```bash
# Работаете 4 часа, потом коммитите все сразу
git add .
git commit -m "Много изменений"
git push
```

**Хорошо:**
```bash
# Каждые 30-60 минут или после завершения логической части
git add frontend/app/dashboard/clinic/calendar-plan/page.tsx
git commit -m "Add employee modal component"
git push origin main

# Через 30 минут
git add frontend/app/dashboard/clinic/calendar-plan/page.tsx
git commit -m "Add employee details display"
git push origin main
```

### 6. Описательные сообщения коммитов

**Плохо:**
```bash
git commit -m "fix"
git commit -m "update"
git commit -m "changes"
```

**Хорошо:**
```bash
git commit -m "Add employee details modal in calendar plan"
git commit -m "Fix: Employee phone number display"
git commit -m "Update: Calendar plan API endpoint"
```

### 7. Проверка статуса перед коммитом

```bash
# Проверьте, что коммитите
git status

# Посмотрите изменения
git diff

# Добавьте только нужные файлы
git add frontend/app/dashboard/clinic/calendar-plan/page.tsx
git add docs/CALENDAR_PLAN_EMPLOYEE_DETAILS.md

# Не добавляйте все подряд
# git add . # <- Осторожно!
```

## Ежедневный workflow

### Утро (начало работы)

```bash
# 1. Обновите код
git pull origin main

# 2. Проверьте статус
git status

# 3. Если есть конфликты - разрешите их сразу

# 4. Перезапустите Docker (если нужно)
docker-compose restart
```

### В течение дня

```bash
# Каждые 30-60 минут:

# 1. Проверьте статус
git status

# 2. Добавьте изменения
git add <измененные файлы>

# 3. Коммит
git commit -m "Описание изменений"

# 4. Обновите и запушьте
git pull origin main
git push origin main
```

### Вечер (конец работы)

```bash
# 1. Закоммитьте все изменения
git add .
git commit -m "End of day: описание работы"

# 2. Обновите и запушьте
git pull origin main
git push origin main

# 3. Напишите коллеге, что закончили работу
```

## Разрешение конфликтов

### Если возник конфликт при pull

```bash
# 1. Git покажет конфликтующие файлы
git pull origin main
# CONFLICT (content): Merge conflict in frontend/app/dashboard/clinic/calendar-plan/page.tsx

# 2. Откройте файл и найдите маркеры конфликта:
# <<<<<<< HEAD
# Ваш код
# =======
# Код коллеги
# >>>>>>> origin/main

# 3. Решите, какой код оставить (или объедините оба)

# 4. Удалите маркеры конфликта

# 5. Добавьте файл
git add frontend/app/dashboard/clinic/calendar-plan/page.tsx

# 6. Завершите слияние
git commit -m "Merge: resolve conflict in calendar-plan"

# 7. Запушьте
git push origin main
```

### Если хотите отменить слияние

```bash
# Отменить слияние и вернуться к состоянию до pull
git merge --abort

# Или сбросить все изменения (ОСТОРОЖНО!)
git reset --hard origin/main
```

## Продвинутый workflow с feature-ветками

### Создание feature-ветки

```bash
# 1. Обновите main
git checkout main
git pull origin main

# 2. Создайте ветку от актуального main
git checkout -b feature/employee-modal

# 3. Работайте в ветке
# ... делаете изменения ...

# 4. Коммитите в ветку
git add .
git commit -m "Add employee modal"

# 5. Можете пушить ветку на сервер (опционально)
git push origin feature/employee-modal
```

### Слияние feature-ветки в main

```bash
# 1. Переключитесь на main
git checkout main

# 2. Обновите main
git pull origin main

# 3. Влейте вашу ветку
git merge feature/employee-modal

# 4. Если есть конфликты - разрешите их

# 5. Запушьте в main
git push origin main

# 6. Удалите ветку локально
git branch -d feature/employee-modal

# 7. Удалите ветку на сервере (если пушили)
git push origin --delete feature/employee-modal
```

## Полезные команды

### Просмотр истории

```bash
# Последние 10 коммитов
git log --oneline -10

# Графическое представление
git log --oneline --graph --all

# Кто и когда менял файл
git log --follow frontend/app/dashboard/clinic/calendar-plan/page.tsx
```

### Отмена изменений

```bash
# Отменить изменения в файле (до git add)
git checkout -- frontend/app/dashboard/clinic/calendar-plan/page.tsx

# Убрать файл из staging (после git add, до commit)
git reset HEAD frontend/app/dashboard/clinic/calendar-plan/page.tsx

# Отменить последний коммит (но сохранить изменения)
git reset --soft HEAD~1

# Отменить последний коммит (и удалить изменения)
git reset --hard HEAD~1
```

### Временное сохранение изменений

```bash
# Сохранить изменения без коммита
git stash

# Обновить код
git pull origin main

# Вернуть сохраненные изменения
git stash pop
```

## Чек-лист перед коммитом

- [ ] `git pull origin main` - обновил код
- [ ] `git status` - проверил, что коммичу
- [ ] `git diff` - просмотрел изменения
- [ ] Удалил `console.log()` и отладочный код
- [ ] Проверил, что код работает в Docker
- [ ] Написал понятное сообщение коммита
- [ ] `git push origin main` - запушил изменения
- [ ] Написал коллеге о важных изменениях

## Экстренные ситуации

### Случайно закоммитили в main вместо feature-ветки

```bash
# 1. Создайте ветку с текущими изменениями
git branch feature/my-changes

# 2. Откатите main на один коммит назад
git reset --hard HEAD~1

# 3. Переключитесь на feature-ветку
git checkout feature/my-changes

# 4. Продолжайте работу
```

### Нужно срочно переключиться на другую задачу

```bash
# 1. Сохраните текущие изменения
git stash save "WIP: employee modal"

# 2. Переключитесь на другую задачу
git checkout main
git pull origin main

# 3. Работайте над срочной задачей...

# 4. Вернитесь к предыдущей работе
git stash list  # Посмотрите список сохраненных изменений
git stash pop   # Восстановите последние изменения
```

### Коллега запушил, а у вас есть незакоммиченные изменения

```bash
# 1. Сохраните изменения
git stash

# 2. Обновите код
git pull origin main

# 3. Верните изменения
git stash pop

# 4. Если есть конфликты - разрешите их

# 5. Продолжайте работу
```

## Рекомендации для вашего проекта

### Структура веток

```
main (production-ready код)
  ├── feature/clinic-calendar-plan (Разработчик 1)
  ├── feature/employer-dashboard (Разработчик 2)
  └── hotfix/urgent-bug (Срочные исправления)
```

### Соглашение об именовании веток

- `feature/` - новая функциональность
- `fix/` - исправление бага
- `hotfix/` - срочное исправление
- `refactor/` - рефакторинг кода
- `docs/` - изменения в документации

Примеры:
- `feature/employee-details-modal`
- `fix/calendar-plan-date-format`
- `hotfix/login-error`
- `refactor/api-client`
- `docs/git-workflow`

### Частота синхронизации

**Минимум:**
- Утром: `git pull`
- Перед обедом: `git push`
- Вечером: `git push`

**Оптимально:**
- Каждые 30-60 минут: `git pull && git push`
- После каждой завершенной задачи: `git push`

## Инструменты для упрощения работы

### Git GUI клиенты

- **GitKraken** - визуальный интерфейс
- **SourceTree** - бесплатный от Atlassian
- **GitHub Desktop** - простой и понятный
- **VS Code Git** - встроенный в редактор

### VS Code расширения

- **GitLens** - расширенная информация о коммитах
- **Git Graph** - визуализация истории
- **Git History** - просмотр истории файлов

## Заключение

Главные правила:
1. **Часто пулите** - `git pull origin main`
2. **Часто пушите** - `git push origin main`
3. **Используйте ветки** - для больших задач
4. **Общайтесь** - перед изменением общих файлов
5. **Коммитьте логически** - одна задача = один коммит

При соблюдении этих правил конфликты будут минимальными и легко разрешимыми.
