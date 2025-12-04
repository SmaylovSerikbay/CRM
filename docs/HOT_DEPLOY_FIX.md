# Hot Deploy Fix

## Проблема

При выполнении `make hot-pull` возникали ошибки:

1. **Backend**: `pkill: executable file not found` - команда pkill отсутствует в контейнере
2. **Frontend**: `next: not found` - npm и node_modules отсутствуют в production контейнере

## Причина

### Backend
Backend контейнер использует минимальный `python:3.11-slim` образ без утилиты `pkill` (пакет `procps`).

### Frontend
Frontend использует **multi-stage Docker build**:
- Стадия `deps`: устанавливает зависимости
- Стадия `builder`: собирает Next.js приложение
- Стадия `runner`: **только runtime** - содержит только собранные файлы и Node.js

В финальном production образе **нет**:
- npm
- node_modules
- исходного кода
- возможности пересборки

## Решение

### Backend Hot Deploy ✅
**Работает** - используется `docker restart` вместо `pkill`:

```bash
make hot-backend          # Hot deploy backend
make hot-pull-backend     # Git pull + hot deploy backend
```

**Время**: ~10 секунд

### Frontend Hot Deploy ❌
**Не поддерживается** для production build.

**Альтернативы**:

1. **Быстрый деплой** (рекомендуется):
   ```bash
   make bg-auto-fast
   ```
   - Использует Docker cache
   - Пересобирает только изменения
   - Время: ~2-3 минуты

2. **Полный деплой**:
   ```bash
   make bg-auto-full
   ```
   - Полная пересборка без cache
   - Время: ~10-15 минут

## Обновленные команды

### Работающие команды:
```bash
make hot                  # ✅ Backend hot deploy (основная команда)
make hot-pull             # ✅ Git pull + backend hot deploy (основная команда)
make hot-backend          # ✅ Backend hot deploy
make hot-pull-backend     # ✅ Git pull + backend hot deploy
make bg-auto-fast         # ✅ Быстрый blue-green deploy (для frontend)
make bg-auto-full         # ✅ Полный blue-green deploy
```

### Команды с предупреждением:
```bash
make hot-frontend         # ⚠️  Показывает предупреждение (не работает)
make hot-pull-frontend    # ⚠️  Показывает предупреждение (не работает)
```

## Рекомендации

### Для быстрых изменений backend:
```bash
# Изменили код backend
make hot-pull-backend     # ~10 сек
```

### Для изменений frontend:
```bash
# Изменили код frontend
make bg-auto-fast         # ~2-3 мин
```

### Для изменений обоих:
```bash
# Изменили backend и frontend
make bg-auto-fast         # ~2-3 мин (обновит оба)
```

## Альтернатива: Development режим

Если нужен **настоящий hot reload** для разработки:

```bash
# Запустить в dev режиме
make dev

# Frontend будет с hot reload на порту 3001
# Backend будет с auto-reload на порту 8001
```

В dev режиме:
- Frontend имеет полный npm и hot reload
- Backend перезагружается при изменении кода
- Но это **не production** окружение

## Итог

| Задача | Команда | Время |
|--------|---------|-------|
| Обновить backend | `make hot-pull-backend` | ~10 сек |
| Обновить frontend | `make bg-auto-fast` | ~2-3 мин |
| Обновить всё | `make bg-auto-fast` | ~2-3 мин |
| Полная пересборка | `make bg-auto-full` | ~10-15 мин |
| Разработка с hot reload | `make dev` | - |
