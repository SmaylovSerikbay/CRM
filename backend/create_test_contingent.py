#!/usr/bin/env python
"""
Скрипт для создания тестового контингента сотрудников
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from api.models import ContingentEmployee, User, Contract

def create_test_contingent():
    # Получаем пользователя и договор
    try:
        user = User.objects.get(id=1)
        contract = Contract.objects.get(id=1)
    except (User.DoesNotExist, Contract.DoesNotExist) as e:
        print(f"Ошибка: {e}")
        return

    # Создаем тестовых сотрудников
    employees = [
        {
            'name': 'Иванов Иван Иванович',
            'iin': '900101300123',
            'position': 'Инженер',
            'department': 'AVR GROUP KZ',
            'phone': '+77001234567',
            'gender': 'male',
            'harmful_factors': ['Шум', 'Вибрация']
        },
        {
            'name': 'Петрова Мария Сергеевна',
            'iin': '950202400234',
            'position': 'Бухгалтер',
            'department': 'AVR GROUP KZ',
            'phone': '+77001234568',
            'gender': 'female',
            'harmful_factors': ['Работа с компьютером']
        },
        {
            'name': 'Сидоров Петр Александрович',
            'iin': '880303500345',
            'position': 'Водитель',
            'department': 'ТОО "КТЖ Грузовые перевозки" - "Карагандинское отделение ГП", Станция Жанаарка',
            'phone': '+77001234569',
            'gender': 'male',
            'harmful_factors': ['Вибрация', 'Шум', 'Пыль']
        },
        {
            'name': 'Казиева Айгуль Нурлановна',
            'iin': '920404600456',
            'position': 'Менеджер',
            'department': 'ТОО "КТЖ Грузовые перевозки" - "Карагандинское отделение ГП", Станция Жанаарка',
            'phone': '+77001234570',
            'gender': 'female',
            'harmful_factors': ['Работа с компьютером']
        }
    ]

    created = 0
    for emp_data in employees:
        # Проверяем, не существует ли уже сотрудник с таким ИИН
        if ContingentEmployee.objects.filter(iin=emp_data['iin']).exists():
            print(f'Пропущен (уже существует): {emp_data["name"]}')
            continue
            
        emp = ContingentEmployee.objects.create(
            user=user,
            contract=contract,
            name=emp_data['name'],
            iin=emp_data['iin'],
            position=emp_data['position'],
            department=emp_data['department'],
            phone=emp_data.get('phone'),
            gender=emp_data.get('gender'),
            harmful_factors=emp_data.get('harmful_factors', []),
            requires_examination=True
        )
        created += 1
        print(f'✓ Создан: {emp.name} ({emp.department})')

    print(f'\n{"="*60}')
    print(f'Создано новых сотрудников: {created}')
    print(f'Всего сотрудников в базе: {ContingentEmployee.objects.count()}')
    print(f'{"="*60}')
    
    # Показываем статистику по участкам
    departments = ContingentEmployee.objects.values_list('department', flat=True).distinct()
    print(f'\nУчастки/объекты:')
    for dept in departments:
        count = ContingentEmployee.objects.filter(department=dept).count()
        print(f'  - {dept}: {count} сотрудников')

if __name__ == '__main__':
    create_test_contingent()
