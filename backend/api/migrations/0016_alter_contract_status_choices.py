from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0015_alter_calendarplan_department_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='contract',
            name='status',
            field=models.CharField(
                choices=[
                    ('draft', 'Черновик'),
                    ('pending_approval', 'Ожидает согласования'),
                    ('approved', 'Согласован'),
                    ('active', 'Действует'),
                    ('in_progress', 'В процессе исполнения'),
                    ('partially_executed', 'Частично исполнен'),
                    ('rejected', 'Отклонен'),
                    ('sent', 'Отправлен'),
                    ('executed', 'Исполнен'),
                    ('cancelled', 'Отменен'),
                ],
                default='draft',
                max_length=20,
                verbose_name='Статус',
            ),
        ),
    ]

