# Система тем

## Обзор

Проект использует систему переключения тем (светлая/темная) с сохранением выбора пользователя в localStorage.

## Основные компоненты

### 1. ThemeProvider (`lib/theme-provider.tsx`)
- Управляет состоянием темы
- Сохраняет выбор в localStorage
- Предоставляет хук `useTheme()` для доступа к теме

### 2. ThemeToggle (`components/theme-toggle.tsx`)
- Кнопка переключения темы
- Показывает иконку луны (темная тема) или солнца (светлая тема)
- Можно разместить в любом месте приложения

### 3. ThemeScript (`app/theme-script.tsx`)
- Предотвращает мигание при загрузке страницы
- Применяет сохраненную тему до загрузки React

## Использование

### Переключение темы в компоненте

```tsx
import { useTheme } from '@/lib/theme-provider';

function MyComponent() {
  const { theme, toggleTheme, setTheme } = useTheme();
  
  return (
    <div>
      <p>Текущая тема: {theme}</p>
      <button onClick={toggleTheme}>Переключить</button>
      <button onClick={() => setTheme('dark')}>Темная</button>
      <button onClick={() => setTheme('light')}>Светлая</button>
    </div>
  );
}
```

### Добавление кнопки переключения

```tsx
import { ThemeToggle } from '@/components/theme-toggle';

function Navigation() {
  return (
    <nav>
      <ThemeToggle />
    </nav>
  );
}
```

## Стилизация с темами

### Tailwind CSS

Используйте префикс `dark:` для стилей темной темы:

```tsx
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
  Контент
</div>
```

### CSS переменные

В `globals.css` определены переменные:

```css
:root {
  --background: #ffffff;
  --foreground: #171717;
}

.dark {
  --background: #0a0a0a;
  --foreground: #ededed;
}
```

Использование:

```tsx
<div className="bg-[var(--background)] text-[var(--foreground)]">
  Контент
</div>
```

## Конфигурация

### Tailwind Config

В `tailwind.config.ts` включен режим `class`:

```ts
const config: Config = {
  darkMode: 'class',
  // ...
};
```

### По умолчанию

По умолчанию используется светлая тема. Это можно изменить в `theme-provider.tsx`:

```tsx
// Изменить на 'dark' для темной темы по умолчанию
setThemeState('light');
```

## Где добавлена кнопка переключения

1. **Главная страница** (`app/page.tsx`) - в навигации
2. **Страница авторизации** (`app/auth/page.tsx`) - в правом верхнем углу
3. **Sidebar дашборда** (`components/layout/Sidebar.tsx`) - в нижней части, перед настройками

## Цветовая схема

### Светлая тема
- Фон: `#ffffff` (белый)
- Текст: `#171717` (почти черный)
- Акцент: черный

### Темная тема
- Фон: `#0a0a0a` (почти черный)
- Текст: `#ededed` (светло-серый)
- Акцент: белый

## Примечания

- Тема сохраняется в localStorage и восстанавливается при следующем визите
- Система не использует `prefers-color-scheme` - выбор пользователя имеет приоритет
- Все пользователи видят одинаковую тему по умолчанию (светлую)
