# Generated manually to remove old is_subcontract column

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0005_fix_is_subcontracted_default'),
    ]

    operations = [
        # Удаляем старую колонку is_subcontract (без "ed")
        migrations.RunSQL(
            sql="ALTER TABLE api_contract DROP COLUMN IF EXISTS is_subcontract;",
            reverse_sql="",
        ),
    ]
