# Backend - Django REST API

Django REST API для CRM Medical Platform.

## 🛠️ Технологии

- Django 4.2
- Django REST Framework 3.14
- PostgreSQL 15
- Green API (WhatsApp OTP)
- ReportLab (PDF экспорт)
- OpenPyXL (Excel экспорт)
- QRCode (генерация QR-кодов)

## 📁 Структура

```
backend/
├── api/                    # Основное приложение
│   ├── models.py          # Модели данных
│   ├── serializers.py     # Сериализаторы DRF
│   ├── views.py           # API endpoints
│   ├── urls.py            # URL маршруты
│   └── admin.py           # Django Admin
├── crm_backend/           # Настройки проекта
│   ├── settings.py        # Конфигурация Django
│   ├── urls.py            # Главные URL
│   └── wsgi.py            # WSGI конфигурация
├── manage.py              # Django CLI
└── requirements.txt       # Python зависимости
```

## 🚀 Локальный запуск

### Установка зависимостей

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Настройка базы данных

```bash
# Создайте .env файл на основе .env.example
cp .env.example .env

# Примените миграции
python manage.py makemigrations
python manage.py migrate
```

### Создание суперпользователя

```bash
python manage.py createsuperuser
```

### Запуск сервера

```bash
python manage.py runserver
```

API будет доступен на http://localhost:8000/api

## 📡 API Endpoints

### Авторизация
- `POST /api/users/send_otp/` - Отправка OTP кода
- `POST /api/users/verify_otp/` - Проверка OTP
- `POST /api/users/complete_registration/` - Завершение регистрации

### Контингент
- `GET /api/contingent/` - Список сотрудников
- `POST /api/contingent/` - Создать сотрудника
- `POST /api/contingent/upload_excel/` - Загрузить Excel
- `GET /api/contingent/{id}/` - Детали сотрудника
- `PATCH /api/contingent/{id}/` - Обновить сотрудника
- `DELETE /api/contingent/{id}/` - Удалить сотрудника

### Календарные планы
- `GET /api/calendar-plans/` - Список планов
- `POST /api/calendar-plans/` - Создать план
- `GET /api/calendar-plans/{id}/` - Детали плана
- `PATCH /api/calendar-plans/{id}/` - Обновить план
- `DELETE /api/calendar-plans/{id}/` - Удалить план

### Маршрутные листы
- `GET /api/route-sheets/` - Список листов
- `POST /api/route-sheets/create_by_iin/` - Создать по ИИН
- `GET /api/route-sheets/{id}/` - Детали листа
- `GET /api/route-sheets/{id}/generate_qr_code/` - Генерация QR-кода
- `PATCH /api/route-sheets/{id}/` - Обновить лист

### Лабораторные исследования
- `GET /api/laboratory-tests/` - Список исследований
- `POST /api/laboratory-tests/` - Создать исследование
- `PATCH /api/laboratory-tests/{id}/` - Обновить результаты

### Функциональные исследования
- `GET /api/functional-tests/` - Список исследований
- `POST /api/functional-tests/` - Создать исследование
- `PATCH /api/functional-tests/{id}/` - Обновить результаты

### Врачебные осмотры
- `GET /api/examinations/` - Список осмотров
- `POST /api/examinations/` - Создать осмотр
- `GET /api/examinations/patient_history/` - История пациента
- `PATCH /api/examinations/{id}/` - Обновить осмотр

### Экспертиза
- `GET /api/expertises/` - Список экспертиз
- `POST /api/expertises/` - Создать экспертизу
- `PATCH /api/expertises/{id}/` - Обновить вердикт

### Направления
- `GET /api/referrals/` - Список направлений
- `POST /api/referrals/` - Создать направление
- `PATCH /api/referrals/{id}/` - Обновить статус

### Отчеты
- `GET /api/expertises/summary_report/` - Сводный отчет
- `GET /api/expertises/export_summary_report_pdf/` - Экспорт PDF
- `GET /api/expertises/export_summary_report_excel/` - Экспорт Excel
- `GET /api/expertises/export_final_act_pdf/` - Заключительный акт PDF
- `GET /api/expertises/export_final_act_excel/` - Заключительный акт Excel

### Электронная очередь
- `GET /api/patient-queue/` - Список очереди
- `POST /api/patient-queue/` - Добавить в очередь
- `PATCH /api/patient-queue/{id}/` - Обновить статус

## 🔐 Переменные окружения

Создайте файл `.env` на основе `.env.example`:

```env
SECRET_KEY=your-secret-key
DEBUG=True
POSTGRES_DB=crm_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
GREEN_API_ID_INSTANCE=your-instance-id
GREEN_API_TOKEN=your-token
GREEN_API_URL=https://api.green-api.com
```

## 🐳 Docker

Backend автоматически запускается в Docker контейнере при использовании docker-compose.

```bash
# Выполнить команду в контейнере
docker-compose exec backend python manage.py shell

# Просмотр логов
docker-compose logs -f backend
```

## 📝 Модели данных

### User
Пользователь системы (клиника, работодатель)

### Contingent
Список сотрудников работодателя

### CalendarPlan
Календарный план медосмотров

### RouteSheet
Маршрутный лист пациента

### LaboratoryTest
Лабораторные исследования

### FunctionalTest
Функциональные исследования (ЭКГ, спирометрия и т.д.)

### DoctorExamination
Врачебные осмотры

### Expertise
Экспертиза профпатолога

### Referral
Направления на реабилитацию/профпатологию

### PatientQueue
Электронная очередь

## 🧪 Тестирование

```bash
# Запуск тестов
python manage.py test

# С покрытием
coverage run --source='.' manage.py test
coverage report
```

## 📚 Дополнительная информация

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Green API Docs](https://green-api.com/docs/)
