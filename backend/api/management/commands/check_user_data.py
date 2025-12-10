from django.core.management.base import BaseCommand
from api.models import User, Contract
import json


class Command(BaseCommand):
    help = 'Проверяет данные пользователя'

    def add_arguments(self, parser):
        parser.add_argument('--user-id', type=int, help='ID пользователя для проверки', default=9)

    def handle(self, *args, **options):
        user_id = options['user_id']
        
        try:
            user = User.objects.get(id=user_id)
            
            self.stdout.write(f"=== ДАННЫЕ ПОЛЬЗОВАТЕЛЯ ID={user_id} ===")
            self.stdout.write(f"Телефон: {user.phone}")
            self.stdout.write(f"Роль: {user.role}")
            self.stdout.write(f"Регистрация завершена: {user.registration_completed}")
            self.stdout.write(f"Дата создания: {user.created_at}")
            self.stdout.write(f"Последний вход: {user.last_login_at}")
            
            self.stdout.write(f"\nДанные регистрации:")
            if user.registration_data:
                self.stdout.write(json.dumps(user.registration_data, indent=2, ensure_ascii=False))
            else:
                self.stdout.write("Данные регистрации отсутствуют")
            
            # Проверяем договоры связанные с этим пользователем
            self.stdout.write(f"\n=== ДОГОВОРЫ ПОЛЬЗОВАТЕЛЯ ===")
            contracts = Contract.objects.filter(employer=user)
            self.stdout.write(f"Договоры как employer: {contracts.count()}")
            for contract in contracts:
                self.stdout.write(f"  - №{contract.contract_number}, БИН: {contract.employer_bin}")
            
            clinic_contracts = Contract.objects.filter(clinic=user)
            self.stdout.write(f"Договоры как clinic: {clinic_contracts.count()}")
            for contract in clinic_contracts:
                self.stdout.write(f"  - №{contract.contract_number}, БИН: {contract.employer_bin}")
                
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Пользователь с ID {user_id} не найден"))