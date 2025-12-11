#!/usr/bin/env python
import os
import sys
import django

# Настройка Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from api.models import ContingentEmployee, Contract, User

def debug_contingent():
    print("=== Отладка контингента ===")
    
    # Проверяем общее количество записей
    total_employees = ContingentEmployee.objects.count()
    print(f"Всего записей контингента: {total_employees}")
    
    # Проверяем последние 10 записей
    recent_employees = ContingentEmployee.objects.order_by('-created_at')[:10]
    print(f"\nПоследние {len(recent_employees)} записей:")
    for emp in recent_employees:
        print(f"- ID: {emp.id}, ФИО: {emp.name}, Договор: {emp.contract_id}, Создан: {emp.created_at}")
    
    # Проверяем договоры
    contracts = Contract.objects.all()
    print(f"\nВсего договоров: {contracts.count()}")
    for contract in contracts:
        contingent_count = ContingentEmployee.objects.filter(contract=contract).count()
        print(f"- Договор №{contract.contract_number} (ID: {contract.id}): {contingent_count} сотрудников, статус: {contract.status}")
    
    # Проверяем пользователей-клиник
    clinics = User.objects.filter(role='clinic')
    print(f"\nКлиники ({clinics.count()}):")
    for clinic in clinics:
        contingent_count = ContingentEmployee.objects.filter(user=clinic).count()
        print(f"- {clinic.username} (ID: {clinic.id}): {contingent_count} сотрудников")

if __name__ == '__main__':
    debug_contingent()