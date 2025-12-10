# Generated manually to add employer_registered action to ContractHistory

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_contract_subcontract_amount'),
    ]

    operations = [
        migrations.AlterField(
            model_name='contracthistory',
            name='action',
            field=models.CharField(choices=[('created', 'Создан'), ('updated', 'Обновлен'), ('sent_for_approval', 'Отправлен на согласование'), ('approved', 'Согласован'), ('rejected', 'Отклонен'), ('resent_for_approval', 'Повторно отправлен на согласование'), ('cancelled', 'Отменен'), ('executed', 'Исполнен'), ('subcontracted', 'Передан на субподряд'), ('employer_registered', 'Работодатель зарегистрировался')], max_length=30, verbose_name='Действие'),
        ),
    ]