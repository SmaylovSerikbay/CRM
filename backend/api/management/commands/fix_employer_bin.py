from django.core.management.base import BaseCommand
from api.models import User, Contract, ContractHistory


class Command(BaseCommand):
    help = 'Исправляет БИН работодателя и связывает с договорами'

    def add_arguments(self, parser):
        parser.add_argument('--user-id', type=int, help='ID пользователя', required=True)
        parser.add_argument('--correct-bin', type=str, help='Правильный БИН', required=True)
        parser.add_argument('--dry-run', action='store_true', help='Только показать что будет изменено')

    def normalize_bin(self, bin_number):
        """Нормализует БИН для сравнения"""
        if not bin_number:
            return ''
        return ''.join(str(bin_number).strip().split())

    def handle(self, *args, **options):
        user_id = options['user_id']
        correct_bin = self.normalize_bin(options['correct_bin'])
        dry_run = options['dry_run']
        
        try:
            user = User.objects.get(id=user_id)
            
            if user.role != 'employer':
                self.stdout.write(self.style.ERROR(f"Пользователь {user_id} не является работодателем"))
                return
            
            self.stdout.write(f"=== ИСПРАВЛЕНИЕ БИН РАБОТОДАТЕЛЯ ===")
            self.stdout.write(f"Пользователь: ID={user.id}, телефон={user.phone}")
            self.stdout.write(f"Текущие данные регистрации: {user.registration_data}")
            self.stdout.write(f"Правильный БИН: {correct_bin}")
            
            # Находим договоры с правильным БИНом, которые не связаны с работодателем
            unlinked_contracts = Contract.objects.filter(
                employer_bin=correct_bin,
                employer__isnull=True
            )
            
            self.stdout.write(f"\nНайдено несвязанных договоров с БИН {correct_bin}: {unlinked_contracts.count()}")
            for contract in unlinked_contracts:
                self.stdout.write(f"  - Договор №{contract.contract_number}, статус: {contract.status}")
            
            if dry_run:
                self.stdout.write(f"\n=== РЕЖИМ ПРОСМОТРА (--dry-run) ===")
                self.stdout.write(f"Будет выполнено:")
                self.stdout.write(f"1. Обновить БИН в registration_data с {user.registration_data.get('inn', 'не указан')} на {correct_bin}")
                self.stdout.write(f"2. Связать {unlinked_contracts.count()} договоров с работодателем")
                return
            
            # Обновляем БИН в registration_data
            if user.registration_data:
                user.registration_data['bin'] = correct_bin
                user.registration_data['inn'] = correct_bin  # Обновляем оба поля
            else:
                user.registration_data = {'bin': correct_bin, 'inn': correct_bin}
            
            user.save()
            self.stdout.write(self.style.SUCCESS(f"✓ БИН обновлен в данных пользователя"))
            
            # Связываем договоры с работодателем
            contracts_updated = 0
            for contract in unlinked_contracts:
                contract.employer = user
                contract.save()
                
                # Создаем запись в истории
                try:
                    ContractHistory.objects.create(
                        contract=contract,
                        action='employer_registered',
                        user=user,
                        user_role=user.role,
                        user_name=user.registration_data.get('name', ''),
                        comment=f'Договор связан с работодателем после исправления БИН (было: {user.registration_data.get("inn", "не указан")}, стало: {correct_bin})'
                    )
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"Ошибка создания записи в истории для договора {contract.contract_number}: {e}"))
                
                contracts_updated += 1
                self.stdout.write(self.style.SUCCESS(f"✓ Договор №{contract.contract_number} связан с работодателем"))
            
            self.stdout.write(f"\n=== РЕЗУЛЬТАТ ===")
            self.stdout.write(self.style.SUCCESS(f"Успешно связано договоров: {contracts_updated}"))
            
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Пользователь с ID {user_id} не найден"))