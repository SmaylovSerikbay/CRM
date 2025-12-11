from django.core.management.base import BaseCommand
from api.models import ContingentEmployee, Contract, User

class Command(BaseCommand):
    help = 'Debug contingent data'

    def handle(self, *args, **options):
        self.stdout.write("=== Отладка контингента ===")
        
        # Проверяем общее количество записей
        total_employees = ContingentEmployee.objects.count()
        self.stdout.write(f"Всего записей контингента: {total_employees}")
        
        # Проверяем последние 10 записей
        recent_employees = ContingentEmployee.objects.order_by('-created_at')[:10]
        self.stdout.write(f"\nПоследние {len(recent_employees)} записей:")
        for emp in recent_employees:
            self.stdout.write(f"- ID: {emp.id}, ФИО: {emp.name}, Договор: {emp.contract_id}, Создан: {emp.created_at}")
        
        # Проверяем договоры
        contracts = Contract.objects.all()
        self.stdout.write(f"\nВсего договоров: {contracts.count()}")
        for contract in contracts:
            contingent_count = ContingentEmployee.objects.filter(contract=contract).count()
            self.stdout.write(f"- Договор №{contract.contract_number} (ID: {contract.id}): {contingent_count} сотрудников, статус: {contract.status}")
        
        # Проверяем пользователей-клиник
        clinics = User.objects.filter(role='clinic')
        self.stdout.write(f"\nКлиники ({clinics.count()}):")
        for clinic in clinics:
            contingent_count = ContingentEmployee.objects.filter(user=clinic).count()
            self.stdout.write(f"- {clinic.username} (ID: {clinic.id}): {contingent_count} сотрудников")