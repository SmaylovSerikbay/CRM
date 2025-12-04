# Frontend - Next.js Application

Next.js приложение для CRM Medical Platform.

## 🛠️ Технологии

- Next.js 14
- TypeScript
- Tailwind CSS
- Framer Motion (анимации)
- Recharts (графики)
- React Hook Form + Zod (формы)
- Lucide React (иконки)

## 📁 Структура

```
frontend/
├── app/                      # Next.js App Router
│   ├── auth/                # Авторизация
│   ├── register/            # Регистрация
│   ├── select-role/         # Выбор роли
│   ├── dashboard/           # Дашборды
│   │   ├── clinic/         # Личный кабинет клиники
│   │   ├── employer/       # Личный кабинет работодателя
│   │   └── settings/       # Настройки
│   ├── layout.tsx          # Главный layout
│   ├── page.tsx            # Главная страница
│   └── globals.css         # Глобальные стили
├── components/              # React компоненты
│   ├── auth/               # Компоненты авторизации
│   ├── dashboard/          # Компоненты дашбордов
│   ├── layout/             # Layout компоненты
│   └── ui/                 # UI компоненты
├── lib/                     # Утилиты
│   ├── api.ts              # API клиент
│   ├── workflow-store-api.ts # Workflow API
│   └── utils.ts            # Вспомогательные функции
├── package.json            # Зависимости
├── tsconfig.json           # TypeScript конфигурация
├── tailwind.config.ts      # Tailwind конфигурация
└── next.config.js          # Next.js конфигурация
```

## 🚀 Локальный запуск

### Установка зависимостей

```bash
npm install
# или
yarn install
```

### Настройка переменных окружения

```bash
# Создайте .env файл на основе .env.example
cp .env.example .env
```

Содержимое `.env`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NODE_ENV=development
```

### Запуск dev сервера

```bash
npm run dev
# или
yarn dev
```

Приложение будет доступно на http://localhost:3000

### Сборка для production

```bash
npm run build
npm start
```

## 📱 Страницы и роуты

### Публичные страницы
- `/` - Главная страница
- `/auth` - Авторизация (WhatsApp OTP)
- `/register` - Регистрация
- `/select-role` - Выбор роли

### Личный кабинет клиники (`/dashboard/clinic`)

#### Менеджер
- `/dashboard/clinic` - Главная
- `/dashboard/clinic/calendar-plan` - Календарный план
- `/dashboard/clinic/final-act` - Заключительный акт
- `/dashboard/clinic/health-plan` - План оздоровления
- `/dashboard/clinic/summary-report` - Сводный отчет

#### Регистратура
- `/dashboard/clinic/route-sheets` - Маршрутные листы
- `/dashboard/clinic/route-sheet` - Детали маршрутного листа
- `/dashboard/clinic/queue` - Электронная очередь

#### Врачи
- `/dashboard/clinic/examinations` - Врачебные осмотры
- `/dashboard/clinic/patient-history` - История осмотров

#### Профпатолог
- `/dashboard/clinic/expertise` - Экспертиза
- `/dashboard/clinic/referrals` - Направления

#### Лаборатория
- `/dashboard/clinic/laboratory-tests` - Лабораторные исследования
- `/dashboard/clinic/functional-tests` - Функциональные исследования

### Личный кабинет работодателя (`/dashboard/employer`)
- `/dashboard/employer` - Главная
- `/dashboard/employer/contingent` - Список контингента
- `/dashboard/employer/employees` - Сотрудники
- `/dashboard/employer/calendar-plan` - Календарный план

## 🎨 Компоненты

### UI компоненты (`components/ui/`)
- `Button` - Кнопки
- `Input` - Поля ввода
- `Card` - Карточки
- `Badge` - Бейджи
- `Modal` - Модальные окна
- `Table` - Таблицы

### Layout компоненты (`components/layout/`)
- `Sidebar` - Боковое меню
- `Header` - Шапка
- `Footer` - Подвал

### Dashboard компоненты (`components/dashboard/`)
- `StatsCard` - Карточки статистики
- `ChartCard` - Карточки с графиками
- `ActivityList` - Список активности

## 🔌 API интеграция

API клиент находится в `lib/api.ts` и `lib/workflow-store-api.ts`.

### Пример использования

```typescript
import { api } from '@/lib/api';

// Получить список контингента
const contingent = await api.contingent.list(userId);

// Создать маршрутный лист
const routeSheet = await api.routeSheets.createByIIN(iin, userId);

// Обновить осмотр
await api.examinations.update(id, data);
```

## 🎨 Стилизация

Проект использует Tailwind CSS для стилизации.

### Основные цвета
- Primary: `blue-600`
- Success: `green-600`
- Warning: `yellow-600`
- Danger: `red-600`

### Кастомные классы
Определены в `app/globals.css`

## 📊 Графики и визуализация

Используется библиотека Recharts для отображения графиков:
- Столбчатые диаграммы (BarChart)
- Круговые диаграммы (PieChart)
- Линейные графики (LineChart)

## 🔐 Авторизация

Авторизация через WhatsApp OTP с использованием Green API:
1. Пользователь вводит номер телефона
2. Отправляется OTP код через WhatsApp
3. Пользователь вводит код
4. Система создает/находит пользователя

## 🐳 Docker

Frontend автоматически запускается в Docker контейнере.

```bash
# Development
docker-compose -f docker-compose.dev.yml up frontend

# Production
docker-compose up frontend
```

## 🧪 Тестирование

```bash
# Запуск тестов (если настроены)
npm test

# Линтинг
npm run lint
```

## 📝 TypeScript

Проект полностью типизирован с TypeScript.

### Основные типы

```typescript
// Пользователь
interface User {
  id: number;
  phone_number: string;
  role: 'clinic' | 'employer';
  clinic_role?: string;
}

// Маршрутный лист
interface RouteSheet {
  id: number;
  patient_id: number;
  patient_name: string;
  iin: string;
  visit_date: string;
  status: string;
}

// Осмотр
interface Examination {
  id: number;
  route_sheet: number;
  doctor_type: string;
  conclusion: string;
  recommendations: string;
}
```

## 🚀 Оптимизация

- Использование Next.js Image для оптимизации изображений
- Code splitting через динамические импорты
- Standalone output для минимального размера Docker образа
- Кэширование API запросов

## 📚 Дополнительная информация

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript](https://www.typescriptlang.org/docs)
- [Recharts](https://recharts.org/)
