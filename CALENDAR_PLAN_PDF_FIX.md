# Исправление ошибки генерации PDF календарного плана

## Проблема 1: Ошибка 404 при генерации PDF
При попытке сгенерировать PDF на странице `/dashboard/clinic/calendar-plan` возникала ошибка 404.

### Причина
В коде страницы `frontend/app/dashboard/clinic/calendar-plan/page.tsx` URL для API формировался неправильно:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const response = await fetch(`${API_URL}/api/calendar-plans/${plan.id}/export_pdf/`, {
```

Переменная окружения `NEXT_PUBLIC_API_URL` уже содержит `/api` в конце (`http://localhost:8001/api`), поэтому итоговый URL получался с дублированием: `/api/api/calendar-plans/5/export_pdf/`

### Решение
Исправлен код в функции `handleGeneratePDF`:

```typescript
// Было:
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const response = await fetch(`${API_URL}/api/calendar-plans/${plan.id}/export_pdf/`, {

// Стало:
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const response = await fetch(`${API_URL}/calendar-plans/${plan.id}/export_pdf/`, {
```

## Проблема 2: Кракозябры вместо кириллицы в PDF
После исправления URL, PDF генерировался, но вместо русского текста отображались непонятные символы (кракозябры).

### Причина
ReportLab по умолчанию использует шрифты Helvetica, которые не поддерживают кириллицу. Необходимо использовать шрифты с поддержкой Unicode, например DejaVu Sans.

### Решение

1. **Добавлены шрифты DejaVu в Docker образ** (`backend/Dockerfile`):
   - Скачаны шрифты DejaVu локально в папку `backend/fonts/`
   - Добавлено копирование шрифтов в образ:
   ```dockerfile
   RUN mkdir -p /usr/share/fonts/truetype/dejavu
   COPY fonts/*.ttf /usr/share/fonts/truetype/dejavu/
   ```

2. **Обновлен код генерации PDF** (`backend/api/views.py`):
   - Добавлен импорт для работы со шрифтами:
   ```python
   from reportlab.pdfbase import pdfmetrics
   from reportlab.pdfbase.ttfonts import TTFont
   ```
   
   - Добавлена регистрация шрифтов DejaVu с fallback на Helvetica:
   ```python
   try:
       import os
       font_paths = [
           '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
           '/usr/share/fonts/dejavu/DejaVuSans.ttf',
           ...
       ]
       
       for font_path in font_paths:
           if os.exists(font_path):
               pdfmetrics.registerFont(TTFont('DejaVuSans', font_path))
               ...
               font_name = 'DejaVuSans'
               font_name_bold = 'DejaVuSans-Bold'
               break
   except Exception as e:
       font_name = 'Helvetica'  # Fallback
       font_name_bold = 'Helvetica-Bold'
   ```
   
   - Обновлены все стили для использования зарегистрированных шрифтов:
   ```python
   title_style = ParagraphStyle(
       'CustomTitle',
       fontName=font_name_bold,  # Вместо 'Helvetica-Bold'
       ...
   )
   ```

## Результат
- PDF генерируется успешно с правильным отображением кириллицы
- Шрифты DejaVu поддерживают русский, казахский и другие языки
- Добавлен fallback на Helvetica если шрифты не найдены

## Файлы изменены
- `frontend/app/dashboard/clinic/calendar-plan/page.tsx` - исправлен URL для генерации PDF
- `backend/api/views.py` - добавлена поддержка кириллических шрифтов
- `backend/Dockerfile` - добавлено копирование шрифтов DejaVu
- `backend/fonts/` - добавлены файлы шрифтов DejaVu (*.ttf)

## Дата исправления
05.12.2024
