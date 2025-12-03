# CRM Medical Platform

Современная платформа для управления медицинскими осмотрами сотрудников с использованием Next.js и Django.

## Технологии

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Django 4.2, Django REST Framework, PostgreSQL
- **Авторизация**: WhatsApp OTP через Green API
- **Docker**: Docker Compose для оркестрации

## Быстрый старт

### Запуск через Docker Compose

```bash
# Запуск всех сервисов
docker-compose up -d --build

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

После запуска:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Django Admin: http://localhost:8000/admin (создайте суперпользователя)

### Создание суперпользователя Django

```bash
docker-compose exec backend python manage.py createsuperuser
```

## Структура проекта

```
├── app/                    # Next.js frontend
│   ├── auth/              # Авторизация
│   ├── dashboard/         # Дашборды
│   └── ...
├── backend/               # Django backend
│   ├── api/               # API endpoints
│   ├── crm_backend/       # Django settings
│   └── ...
├── lib/                   # Утилиты и API клиент
└── docker-compose.yml     # Docker конфигурация
```

## API Endpoints

### Авторизация
- `POST /api/users/send_otp/` - Отправка OTP кода
- `POST /api/users/verify_otp/` - Проверка OTP
- `POST /api/users/complete_registration/` - Завершение регистрации

### Контингент
- `GET /api/contingent/?user_id={id}` - Получить список сотрудников
- `POST /api/contingent/upload_excel/` - Загрузить Excel файл

### Календарные планы
- `GET /api/calendar-plans/?user_id={id}` - Получить планы
- `POST /api/calendar-plans/` - Создать план
- `PATCH /api/calendar-plans/{id}/` - Обновить статус

### Маршрутные листы
- `GET /api/route-sheets/?user_id={id}` - Получить листы
- `POST /api/route-sheets/create_by_iin/` - Создать по ИИН

### Врачебные осмотры
- `GET /api/examinations/?patient_id={id}` - Получить осмотры
- `POST /api/examinations/` - Создать осмотр

### Экспертиза
- `GET /api/expertises/?user_id={id}` - Получить экспертизы
- `POST /api/expertises/` - Создать экспертизу
- `PATCH /api/expertises/{id}/` - Обновить вердикт

## Переменные окружения

### Backend (.env или docker-compose.yml)
- `GREEN_API_ID_INSTANCE` - ID инстанса Green API
- `GREEN_API_TOKEN` - Токен Green API
- `GREEN_API_URL` - URL Green API
- `POSTGRES_DB` - Имя базы данных
- `POSTGRES_USER` - Пользователь БД
- `POSTGRES_PASSWORD` - Пароль БД

### Frontend
- `NEXT_PUBLIC_API_URL` - URL бэкенд API (по умолчанию http://localhost:8000/api)

## Разработка

### Локальная разработка без Docker

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

#### Frontend
```bash
npm install
npm run dev
```

## Функционал

### Личные кабинеты

1. **Клиника** (`/dashboard/clinic`)
   - Менеджер: Календарный план, Заключительный акт, План оздоровления
   - Профпатолог: Экспертиза, Врачебная комиссия
   - Врач: Врачебная комиссия
   - Регистратура: Маршрутные листы

2. **Работодатель** (`/dashboard/employer`)
   - Список контингента
   - Сотрудники
   - Календарный план

### Workflow

1. Работодатель загружает список контингента (Excel)
2. Клиника создает календарный план
3. Работодатель утверждает план
4. Регистратура генерирует маршрутные листы
5. Врачи заполняют заключения
6. Профпатолог выносит вердикт
7. Формируются итоговые документы

## Лицензия

MIT
