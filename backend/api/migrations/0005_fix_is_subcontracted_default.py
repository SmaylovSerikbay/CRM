# Generated manually to fix is_subcontracted default value

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0004_contract_subcontract_amount'),
    ]

    operations = [
        # Сначала обновляем все NULL значения на False
        migrations.RunSQL(
            sql="UPDATE api_contract SET is_subcontracted = FALSE WHERE is_subcontracted IS NULL;",
            reverse_sql="",
        ),
        # Затем устанавливаем NOT NULL constraint с default значением
        migrations.AlterField(
            model_name='contract',
            name='is_subcontracted',
            field=models.BooleanField(default=False, verbose_name='Передан на субподряд', help_text='Флаг указывающий что договор передан на субподряд'),
        ),
    ]
