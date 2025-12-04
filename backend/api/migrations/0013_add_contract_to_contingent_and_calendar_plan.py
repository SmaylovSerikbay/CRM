# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0012_alter_contract_status_contracthistory'),
    ]

    operations = [
        migrations.AddField(
            model_name='contingentemployee',
            name='contract',
            field=models.ForeignKey(blank=True, help_text='Договор, по которому загружен контингент', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='contingent_employees', to='api.Contract', verbose_name='Договор'),
        ),
        migrations.AddField(
            model_name='calendarplan',
            name='contract',
            field=models.ForeignKey(blank=True, help_text='Договор, по которому создан календарный план', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='calendar_plans', to='api.Contract', verbose_name='Договор'),
        ),
    ]
