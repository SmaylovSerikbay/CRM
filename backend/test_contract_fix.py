#!/usr/bin/env python
"""
Тестовый скрипт для проверки исправления связи договоров с работодателями
"""

import os
import sys
import django

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from api.models import User, Contract, ContractHistory


def normalize_bin(bin_number):
    """Нормализует БИН для сравнения"""
    if not bin_number:
        return ''
    return ''.join(str(bin_number).strip().split())


def test_contract_fix():
    """Тестирует исправление связи договоров с работодателями"""
    test_bin = "910719401512"
    test_phone = "77787892050"
    
    print(f"=== ТЕСТ ИСПРАВЛЕНИЯ СВЯЗИ ДОГОВОРОВ ===")
    print(f"Тестовый БИН: {test_bin}")
    print(f"Тестовый телефон: {test_phone}")
    
    # 1. Проверяем, есть ли работодатель с таким БИН
    print(f"\n1. Поиск работодателя с БИН {test_bin}...")
    
    normalized_bin = normalize_bin(test_bin)
    employer = None
    employers = User.objects.filter(role='employer')
    
    for emp in employers:
        reg_data = emp.registration_data or {}
        emp_bin = str(reg_data.get('bin', '')).strip()
        emp_inn = str(reg_data.get('inn', '')).strip()
        
        emp_bin_normalized = normalize_bin(emp_bin)
        emp_inn_normalized = normalize_bin(emp_inn)
        
        if emp_bin_normalized == normalized_bin or emp_inn_normalized == normalized_bin:
            employer = emp
            break
    
    if employer:
        print(f"   ✓ Найден работодатель: ID={employer.id}, телефон={employer.phone}")
        print(f"   Данные регистрации: {employer.registration_data}")
    else:
        print(f"   ✗ Работодатель с БИН {test_bin} не найден")
    
    # 2. Проверяем договоры с этим БИНом
    print(f"\n2. Поиск договоров с БИН {test_bin}...")
    
    contracts_with_bin = Contract.objects.filter(employer_bin=normalized_bin)
    print(f"   Найдено договоров с БИН {normalized_bin}: {contracts_with_bin.count()}")
    
    for contract in contracts_with_bin:
        print(f"   - Договор №{contract.contract_number}, employer_id={contract.employer_id}, статус={contract.status}")
    
    # 3. Проверяем несвязанные договоры
    print(f"\n3. Поиск несвязанных договоров с БИН {test_bin}...")
    
    unlinked_contracts = Contract.objects.filter(
        employer_bin=normalized_bin,
        employer__isnull=True
    )
    print(f"   Найдено несвязанных договоров: {unlinked_contracts.count()}")
    
    for contract in unlinked_contracts:
        print(f"   - Договор №{contract.contract_number}, создан: {contract.created_at}")
    
    # 4. Если есть работодатель и несвязанные договоры, показываем что можно исправить
    if employer and unlinked_contracts.exists():
        print(f"\n4. МОЖНО ИСПРАВИТЬ:")
        print(f"   Работодатель ID {employer.id} может быть связан с {unlinked_contracts.count()} договорами")
        
        # Показываем что произойдет при исправлении
        for contract in unlinked_contracts:
            print(f"   - Договор №{contract.contract_number} будет связан с работодателем {employer.phone}")
    
    # 5. Проверяем пользователей с тестовым телефоном
    print(f"\n5. Поиск пользователей с телефоном {test_phone}...")
    
    users_with_phone = User.objects.filter(phone=test_phone)
    print(f"   Найдено пользователей с телефоном {test_phone}: {users_with_phone.count()}")
    
    for user in users_with_phone:
        print(f"   - ID={user.id}, роль={user.role}, регистрация завершена={user.registration_completed}")
        if user.registration_data:
            print(f"     БИН в данных: {user.registration_data.get('bin', 'не указан')}")


if __name__ == '__main__':
    test_contract_fix()