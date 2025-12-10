from django.core.management.base import BaseCommand
from api.models import User, Contract, ContractHistory


class Command(BaseCommand):
    help = 'Исправляет связи между договорами и работодателями по БИН'

    def normalize_bin(self, bin_number):
        """Нормализует БИН для сравнения"""
        if not bin_number:
            return ''
        return ''.join(str(bin_number).strip().split())

    def handle(self, *args, **options):
        self.stdout.write("Поиск договоров без связанного работодателя...")
        
        # Находим все договоры без связанного работодателя, но с БИНом
        unlinked_contracts = Contract.objects.filter(
            employer__isnull=True,
            employer_bin__isnull=False
        ).exclude(employer_bin='')
        
        self.stdout.write(f"Найдено {unlinked_contracts.count()} договоров без связанного работодателя")
        
        fixed_count = 0
        
        for contract in unlinked_contracts:
            contract_bin = self.normalize_bin(contract.employer_bin)
            if not contract_bin:
                continue
                
            self.stdout.write(f"\nОбрабатываем договор №{contract.contract_number} с БИН: {contract.employer_bin}")
            
            # Ищем работодателя с таким БИН
            employer = None
            employers = User.objects.filter(role='employer')
            
            for emp in employers:
                reg_data = emp.registration_data or {}
                emp_bin = str(reg_data.get('bin', '')).strip()
                emp_inn = str(reg_data.get('inn', '')).strip()
                
                # Нормализуем для сравнения
                emp_bin_normalized = self.normalize_bin(emp_bin)
                emp_inn_normalized = self.normalize_bin(emp_inn)
                
                if emp_bin_normalized == contract_bin or emp_inn_normalized == contract_bin:
                    employer = emp
                    employer_name = reg_data.get('name', emp.phone)
                    self.stdout.write(f"  Найден работодатель: {employer_name} (ID: {emp.id})")
                    break
            
            if employer:
                # Связываем договор с работодателем
                contract.employer = employer
                contract.save()
                
                # Создаем запись в истории
                try:
                    ContractHistory.objects.create(
                        contract=contract,
                        action='employer_registered',
                        user=employer,
                        user_role=employer.role,
                        user_name=employer.registration_data.get('name', '') if employer.registration_data else '',
                        comment='Договор автоматически связан с зарегистрированным работодателем (исправление)'
                    )
                    self.stdout.write(self.style.SUCCESS(f"  ✓ Договор связан с работодателем"))
                    fixed_count += 1
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"  ⚠ Ошибка создания записи в истории: {e}"))
            else:
                self.stdout.write(self.style.ERROR(f"  ✗ Работодатель с БИН {contract.employer_bin} не найден"))
        
        self.stdout.write(f"\n=== РЕЗУЛЬТАТ ===")
        self.stdout.write(f"Всего обработано договоров: {unlinked_contracts.count()}")
        self.stdout.write(self.style.SUCCESS(f"Успешно связано: {fixed_count}"))
        self.stdout.write(f"Не удалось связать: {unlinked_contracts.count() - fixed_count}")