# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0013_add_contract_to_contingent_and_calendar_plan'),
    ]

    operations = [
        migrations.AddField(
            model_name='calendarplan',
            name='departments_info',
            field=models.JSONField(blank=True, default=list, help_text='Список участков с их датами и сотрудниками: [{"department": "Участок 1", "start_date": "2024-01-01", "end_date": "2024-01-31", "employee_ids": [1,2,3]}, ...]', verbose_name='Информация об участках'),
        ),
    ]

