from django.core.management.base import BaseCommand
from api.models import User, Contract, ContractHistory


class Command(BaseCommand):
    help = 'Тестирует исправление связи договоров с работодателями'

    def normalize_bin(self, bin_number):
        """Нормализует БИН для сравнения"""
        if not bin_number:
            return ''
        return ''.join(str(bin_number).strip().split())

    def add_arguments(self, parser):
        parser.add_argument('--bin', type=str, help='БИН для тестирования', default='910719401512')
        parser.add_argument('--phone', type=str, help='Телефон для тестирования', default='77787892050')

    def handle(self, *args, **options):
        test_bin = options['bin']
        test_phone = options['phone']
        
        self.stdout.write(f"=== ТЕСТ ИСПРАВЛЕНИЯ СВЯЗИ ДОГОВОРОВ ===")
        self.stdout.write(f"Тестовый БИН: {test_bin}")
        self.stdout.write(f"Тестовый телефон: {test_phone}")
        
        # 1. Проверяем, есть ли работодатель с таким БИН
        self.stdout.write(f"\n1. Поиск работодателя с БИН {test_bin}...")
        
        normalized_bin = self.normalize_bin(test_bin)
        employer = None
        employers = User.objects.filter(role='employer')
        
        for emp in employers:
            reg_data = emp.registration_data or {}
            emp_bin = str(reg_data.get('bin', '')).strip()
            emp_inn = str(reg_data.get('inn', '')).strip()
            
            emp_bin_normalized = self.normalize_bin(emp_bin)
            emp_inn_normalized = self.normalize_bin(emp_inn)
            
            if emp_bin_normalized == normalized_bin or emp_inn_normalized == normalized_bin:
                employer = emp
                break
        
        if employer:
            self.stdout.write(self.style.SUCCESS(f"   ✓ Найден работодатель: ID={employer.id}, телефон={employer.phone}"))
            self.stdout.write(f"   Данные регистрации: {employer.registration_data}")
        else:
            self.stdout.write(self.style.ERROR(f"   ✗ Работодатель с БИН {test_bin} не найден"))
        
        # 2. Проверяем договоры с этим БИНом
        self.stdout.write(f"\n2. Поиск договоров с БИН {test_bin}...")
        
        contracts_with_bin = Contract.objects.filter(employer_bin=normalized_bin)
        self.stdout.write(f"   Найдено договоров с БИН {normalized_bin}: {contracts_with_bin.count()}")
        
        for contract in contracts_with_bin:
            self.stdout.write(f"   - Договор №{contract.contract_number}, employer_id={contract.employer_id}, статус={contract.status}")
        
        # 3. Проверяем несвязанные договоры
        self.stdout.write(f"\n3. Поиск несвязанных договоров с БИН {test_bin}...")
        
        unlinked_contracts = Contract.objects.filter(
            employer_bin=normalized_bin,
            employer__isnull=True
        )
        self.stdout.write(f"   Найдено несвязанных договоров: {unlinked_contracts.count()}")
        
        for contract in unlinked_contracts:
            self.stdout.write(f"   - Договор №{contract.contract_number}, создан: {contract.created_at}")
        
        # 4. Если есть работодатель и несвязанные договоры, показываем что можно исправить
        if employer and unlinked_contracts.exists():
            self.stdout.write(f"\n4. МОЖНО ИСПРАВИТЬ:")
            self.stdout.write(self.style.WARNING(f"   Работодатель ID {employer.id} может быть связан с {unlinked_contracts.count()} договорами"))
            
            # Показываем что произойдет при исправлении
            for contract in unlinked_contracts:
                self.stdout.write(f"   - Договор №{contract.contract_number} будет связан с работодателем {employer.phone}")
        
        # 5. Проверяем пользователей с тестовым телефоном
        self.stdout.write(f"\n5. Поиск пользователей с телефоном {test_phone}...")
        
        users_with_phone = User.objects.filter(phone=test_phone)
        self.stdout.write(f"   Найдено пользователей с телефоном {test_phone}: {users_with_phone.count()}")
        
        for user in users_with_phone:
            self.stdout.write(f"   - ID={user.id}, роль={user.role}, регистрация завершена={user.registration_completed}")
            if user.registration_data:
                self.stdout.write(f"     БИН в данных: {user.registration_data.get('bin', 'не указан')}")