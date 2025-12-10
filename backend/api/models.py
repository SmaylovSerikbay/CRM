from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    phone = models.CharField(max_length=20, unique=True)
    role = models.CharField(max_length=20, choices=[
        ('clinic', 'Клиника'),
        ('employer', 'Работодатель'),
    ])
    clinic_role = models.CharField(max_length=20, null=True, blank=True, choices=[
        ('manager', 'Менеджер'),
        ('doctor', 'Врач'),
        ('profpathologist', 'Профпатолог'),
        ('receptionist', 'Регистратура'),
    ])
    registration_completed = models.BooleanField(default=False)
    registration_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_login_at = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = 'phone'
    REQUIRED_FIELDS = []

    # Fix reverse accessor conflicts
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to.',
        related_name='crm_user_set',
        related_query_name='crm_user',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name='crm_user_set',
        related_query_name='crm_user',
    )


class ContingentEmployee(models.Model):
    """Список контингента - лица, подлежащие обязательному медосмотру по приказу №131"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='contingent_employees')
    contract = models.ForeignKey('Contract', on_delete=models.CASCADE, related_name='contingent_employees', null=True, blank=True, verbose_name='Договор', help_text='Договор, по которому загружен контингент')
    name = models.CharField(max_length=255, verbose_name='ФИО')
    birth_date = models.DateField(null=True, blank=True, verbose_name='Дата рождения')
    gender = models.CharField(max_length=10, choices=[('male', 'Мужской'), ('female', 'Женский')], blank=True, verbose_name='Пол')
    department = models.CharField(max_length=255, verbose_name='Объект или участок')
    position = models.CharField(max_length=255, verbose_name='Занимаемая должность')
    total_experience_years = models.IntegerField(null=True, blank=True, verbose_name='Общий стаж (лет)')
    position_experience_years = models.IntegerField(null=True, blank=True, verbose_name='Стаж по занимаемой должности (лет)')
    last_examination_date = models.DateField(null=True, blank=True, verbose_name='Дата последнего медосмотра')
    harmful_factors = models.JSONField(default=list, verbose_name='Профессиональная вредность')
    notes = models.TextField(blank=True, verbose_name='Примечание')
    iin = models.CharField(max_length=20, blank=True, verbose_name='ИИН')  # Необязательное поле, может быть пустым
    phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон')
    requires_examination = models.BooleanField(default=True, verbose_name='Требуется осмотр')
    next_examination_date = models.DateField(null=True, blank=True, verbose_name='Дата следующего осмотра')
    quarter = models.CharField(max_length=20, blank=True, verbose_name='Квартал')  # 1 квартал, 2 квартал и т.д.
    created_at = models.DateTimeField(auto_now_add=True)


class CalendarPlan(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Черновик'),
        ('pending_clinic', 'Ожидает утверждения клиникой'),
        ('pending_employer', 'Ожидает утверждения работодателем'),
        ('approved', 'Утвержден'),
        ('rejected', 'Отклонен работодателем'),
        ('sent_to_ses', 'Отправлен в СЭС'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='calendar_plans')
    contract = models.ForeignKey('Contract', on_delete=models.CASCADE, related_name='calendar_plans', null=True, blank=True, verbose_name='Договор', help_text='Договор, по которому создан календарный план')
    department = models.CharField(max_length=255, verbose_name='Объект/участок', help_text='Основной объект/участок (для обратной совместимости)')
    start_date = models.DateField(verbose_name='Дата начала', help_text='Общая дата начала (минимальная из всех участков)')
    end_date = models.DateField(verbose_name='Дата окончания', help_text='Общая дата окончания (максимальная из всех участков)')
    employee_ids = models.JSONField(default=list, verbose_name='ID сотрудников', help_text='Список ID всех сотрудников из всех выбранных участков')
    departments_info = models.JSONField(default=list, blank=True, verbose_name='Информация об участках', help_text='Список участков с их датами и сотрудниками: [{"department": "Участок 1", "start_date": "2024-01-01", "end_date": "2024-01-31", "employee_ids": [1,2,3]}, ...]')
    harmful_factors = models.JSONField(default=list, verbose_name='Вредные факторы', help_text='Список вредных факторов для формирования приказа медкомиссии')
    selected_doctors = models.JSONField(default=list, verbose_name='Выбранные врачи клиники', help_text='Список ID врачей, которые будут проводить осмотр')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    clinic_name = models.CharField(max_length=255, blank=True)
    clinic_director = models.CharField(max_length=255, blank=True)
    employer_name = models.CharField(max_length=255, blank=True)
    employer_representative = models.CharField(max_length=255, blank=True)
    ses_representative = models.CharField(max_length=255, blank=True)
    rejection_reason = models.TextField(blank=True, verbose_name='Причина отклонения', help_text='Причина отклонения календарного плана работодателем')
    rejected_by_employer_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата отклонения работодателем')
    created_at = models.DateTimeField(auto_now_add=True)
    approved_by_clinic_at = models.DateTimeField(null=True, blank=True)
    approved_by_employer_at = models.DateTimeField(null=True, blank=True)
    sent_to_ses_at = models.DateTimeField(null=True, blank=True)


class RouteSheet(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='route_sheets')
    patient_id = models.CharField(max_length=255)
    patient_name = models.CharField(max_length=255)
    iin = models.CharField(max_length=12)
    position = models.CharField(max_length=255)
    department = models.CharField(max_length=255)
    visit_date = models.DateField()
    services = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)


class DoctorExamination(models.Model):
    CONCLUSION_CHOICES = [
        ('healthy', 'Здоров'),
        ('unhealthy', 'Не здоров'),
    ]
    
    patient_id = models.CharField(max_length=255)
    doctor_id = models.CharField(max_length=255)
    doctor_name = models.CharField(max_length=255)
    specialization = models.CharField(max_length=255)
    conclusion = models.CharField(max_length=20, choices=CONCLUSION_CHOICES, null=True, blank=True)
    notes = models.TextField(blank=True)
    examination_date = models.DateTimeField(auto_now_add=True)
    doctor_signature = models.CharField(max_length=255, blank=True)
    recommendations = models.TextField(blank=True)


class Expertise(models.Model):
    VERDICT_CHOICES = [
        ('fit', 'Годен'),
        ('temporary_unfit', 'Временная непригодность'),
        ('permanent_unfit', 'Постоянная непригодность'),
    ]
    
    HEALTH_GROUP_CHOICES = [
        ('1', 'Группа 1 - Здоровый'),
        ('2', 'Группа 2 - Практически здоровый'),
        ('3', 'Группа 3 - Имеет признаки воздействия ВПФ'),
        ('4', 'Группа 4 - Требует динамического наблюдения'),
        ('5', 'Группа 5 - Требует лечения'),
        ('6', 'Группа 6 - Требует реабилитации/профпатологии'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='expertises')
    patient_id = models.CharField(max_length=255)
    patient_name = models.CharField(max_length=255)
    iin = models.CharField(max_length=12)
    position = models.CharField(max_length=255)
    department = models.CharField(max_length=255)
    doctor_conclusions = models.JSONField(default=list)
    final_verdict = models.CharField(max_length=20, choices=VERDICT_CHOICES, null=True, blank=True)
    health_group = models.CharField(max_length=1, choices=HEALTH_GROUP_CHOICES, null=True, blank=True, verbose_name='Группа здоровья')
    verdict_date = models.DateTimeField(null=True, blank=True)
    profpathologist_name = models.CharField(max_length=255, blank=True)
    profpathologist_signature = models.CharField(max_length=255, blank=True)
    temporary_unfit_until = models.DateField(null=True, blank=True)
    reason = models.TextField(blank=True)
    requires_referral = models.BooleanField(default=False, verbose_name='Требуется направление')
    referral_type = models.CharField(max_length=50, blank=True, choices=[
        ('rehabilitation', 'Реабилитация'),
        ('profpathology', 'Профпатология'),
        ('specialist', 'Узкий специалист'),
    ], verbose_name='Тип направления')
    referral_sent = models.BooleanField(default=False, verbose_name='Направление отправлено')
    referral_date = models.DateField(null=True, blank=True, verbose_name='Дата направления')
    created_at = models.DateTimeField(auto_now_add=True)


class EmergencyNotification(models.Model):
    """Экстренное извещение при инфекционных заболеваниях (п. 19)"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='emergency_notifications')
    patient_id = models.CharField(max_length=255)
    patient_name = models.CharField(max_length=255)
    iin = models.CharField(max_length=12)
    position = models.CharField(max_length=255)
    department = models.CharField(max_length=255)
    disease_type = models.CharField(max_length=255, verbose_name='Тип заболевания')
    diagnosis = models.TextField(verbose_name='Диагноз')
    doctor_name = models.CharField(max_length=255, verbose_name='Врач, выявивший заболевание')
    sent_to_tsb = models.BooleanField(default=False, verbose_name='Отправлено в ТСБ/СЭБН')
    sent_to_employer = models.BooleanField(default=False, verbose_name='Отправлено работодателю')
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class HealthImprovementPlan(models.Model):
    """План оздоровительных мероприятий для работодателя (годовой план)"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='health_improvement_plans')
    year = models.IntegerField(verbose_name='Год')
    plan_data = models.JSONField(default=dict, verbose_name='Данные плана')
    status = models.CharField(max_length=20, choices=[
        ('draft', 'Черновик'),
        ('pending_tsb', 'Ожидает согласования ТСБ/СЭБН'),
        ('approved', 'Утвержден'),
    ], default='draft')
    approved_by_tsb_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class RecommendationTracking(models.Model):
    """Контроль исполнения рекомендаций для работодателя"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='recommendations')
    patient_id = models.CharField(max_length=255)
    patient_name = models.CharField(max_length=255)
    recommendation = models.TextField(verbose_name='Рекомендация')
    recommendation_type = models.CharField(max_length=50, choices=[
        ('transfer', 'Перевод на другую работу'),
        ('treatment', 'Лечение'),
        ('observation', 'Динамическое наблюдение'),
        ('rehabilitation', 'Реабилитация'),
    ], verbose_name='Тип рекомендации')
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Ожидает исполнения'),
        ('in_progress', 'В процессе'),
        ('completed', 'Выполнено'),
        ('cancelled', 'Отменено'),
    ], default='pending', verbose_name='Статус')
    completion_date = models.DateField(null=True, blank=True, verbose_name='Дата выполнения')
    notes = models.TextField(blank=True, verbose_name='Примечания')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Doctor(models.Model):
    """Врачи клиники"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='doctors', verbose_name='Клиника')
    name = models.CharField(max_length=255, verbose_name='ФИО')
    specialization = models.CharField(max_length=255, verbose_name='Специализация')
    cabinet = models.CharField(max_length=50, null=True, blank=True, verbose_name='Номер кабинета')
    work_schedule = models.JSONField(default=dict, verbose_name='Расписание работы', help_text='Формат: {"monday": {"start": "09:00", "end": "18:00"}, ...}')
    iin = models.CharField(max_length=20, blank=True, verbose_name='ИИН')
    phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон')
    email = models.EmailField(blank=True, verbose_name='Email')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Врач'
        verbose_name_plural = 'Врачи'
        ordering = ['-created_at']
    
    def __str__(self):
        cabinet_info = f" (каб. {self.cabinet})" if self.cabinet else ""
        return f"{self.name} - {self.specialization}{cabinet_info}"


class LaboratoryTest(models.Model):
    """Лабораторные исследования (п. 13 приказа)"""
    STATUS_CHOICES = [
        ('pending', 'Ожидает'),
        ('in_progress', 'В процессе'),
        ('completed', 'Завершено'),
    ]
    
    route_sheet = models.ForeignKey(RouteSheet, on_delete=models.CASCADE, related_name='laboratory_tests', null=True, blank=True)
    patient_id = models.CharField(max_length=255)
    patient_name = models.CharField(max_length=255)
    test_type = models.CharField(max_length=255, verbose_name='Тип исследования', help_text='Например: Общий анализ крови, Биохимия и т.д.')
    test_name = models.CharField(max_length=255, verbose_name='Название анализа')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    results = models.JSONField(default=dict, verbose_name='Результаты', help_text='Структурированные результаты анализов')
    notes = models.TextField(blank=True, verbose_name='Примечания')
    performed_by = models.CharField(max_length=255, blank=True, verbose_name='Выполнил')
    performed_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата выполнения')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Лабораторное исследование'
        verbose_name_plural = 'Лабораторные исследования'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.test_name} - {self.patient_name}"


class FunctionalTest(models.Model):
    """Функциональные исследования (п. 13 приказа) - ЭКГ, спирометрия и т.д."""
    STATUS_CHOICES = [
        ('pending', 'Ожидает'),
        ('in_progress', 'В процессе'),
        ('completed', 'Завершено'),
    ]
    
    route_sheet = models.ForeignKey(RouteSheet, on_delete=models.CASCADE, related_name='functional_tests', null=True, blank=True)
    patient_id = models.CharField(max_length=255)
    patient_name = models.CharField(max_length=255)
    test_type = models.CharField(max_length=255, verbose_name='Тип исследования', help_text='Например: ЭКГ, Спирометрия, Рентген и т.д.')
    test_name = models.CharField(max_length=255, verbose_name='Название исследования')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    results = models.JSONField(default=dict, verbose_name='Результаты', help_text='Структурированные результаты исследований')
    notes = models.TextField(blank=True, verbose_name='Примечания')
    performed_by = models.CharField(max_length=255, blank=True, verbose_name='Выполнил')
    performed_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата выполнения')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Функциональное исследование'
        verbose_name_plural = 'Функциональные исследования'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.test_name} - {self.patient_name}"


class Referral(models.Model):
    """Направления на реабилитацию/профпатологию (п. 22, 24 приказа)"""
    STATUS_CHOICES = [
        ('created', 'Создано'),
        ('sent', 'Отправлено'),
        ('accepted', 'Принято'),
        ('in_progress', 'В процессе'),
        ('completed', 'Завершено'),
        ('cancelled', 'Отменено'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='referrals')
    expertise = models.ForeignKey(Expertise, on_delete=models.CASCADE, related_name='referrals', null=True, blank=True)
    patient_id = models.CharField(max_length=255)
    patient_name = models.CharField(max_length=255)
    iin = models.CharField(max_length=12)
    referral_type = models.CharField(max_length=50, choices=[
        ('rehabilitation', 'Реабилитация'),
        ('profpathology', 'Профпатология'),
        ('specialist', 'Узкий специалист'),
    ], verbose_name='Тип направления')
    target_organization = models.CharField(max_length=255, blank=True, verbose_name='Целевая организация')
    reason = models.TextField(verbose_name='Причина направления')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='created', verbose_name='Статус')
    sent_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата отправки')
    accepted_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата принятия')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата завершения')
    notes = models.TextField(blank=True, verbose_name='Примечания')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Направление'
        verbose_name_plural = 'Направления'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_referral_type_display()} - {self.patient_name}"


class PatientQueue(models.Model):
    """Электронная очередь пациентов"""
    STATUS_CHOICES = [
        ('waiting', 'Ожидает'),
        ('called', 'Вызван'),
        ('in_progress', 'На приеме'),
        ('completed', 'Завершен'),
        ('skipped', 'Пропущен'),
        ('cancelled', 'Отменен'),
    ]
    
    PRIORITY_CHOICES = [
        ('normal', 'Обычный'),
        ('urgent', 'Срочный'),
        ('vip', 'VIP'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='patient_queues', verbose_name='Клиника')
    route_sheet = models.ForeignKey(RouteSheet, on_delete=models.CASCADE, related_name='queue_entries', null=True, blank=True, verbose_name='Маршрутный лист')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='queue_patients', null=True, blank=True, verbose_name='Врач')
    patient_id = models.CharField(max_length=255, verbose_name='ID пациента')
    patient_name = models.CharField(max_length=255, verbose_name='ФИО пациента')
    iin = models.CharField(max_length=12, blank=True, verbose_name='ИИН')
    service_name = models.CharField(max_length=255, verbose_name='Название услуги')
    cabinet = models.CharField(max_length=50, blank=True, verbose_name='Кабинет')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='waiting', verbose_name='Статус')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal', verbose_name='Приоритет')
    queue_number = models.IntegerField(verbose_name='Номер в очереди')
    added_at = models.DateTimeField(auto_now_add=True, verbose_name='Время добавления')
    called_at = models.DateTimeField(null=True, blank=True, verbose_name='Время вызова')
    started_at = models.DateTimeField(null=True, blank=True, verbose_name='Время начала приема')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='Время завершения')
    notes = models.TextField(blank=True, verbose_name='Примечания')
    
    class Meta:
        verbose_name = 'Запись очереди'
        verbose_name_plural = 'Электронная очередь'
        ordering = ['priority', 'queue_number', 'added_at']
        indexes = [
            models.Index(fields=['user', 'status', 'doctor']),
            models.Index(fields=['status', 'queue_number']),
        ]
    
    def __str__(self):
        return f"{self.queue_number}. {self.patient_name} - {self.service_name} ({self.get_status_display()})"


class Contract(models.Model):
    """Договор между работодателем и клиникой"""
    STATUS_CHOICES = [
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
    ]
    
    employer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='contracts_as_employer', verbose_name='Работодатель', null=True, blank=True)
    clinic = models.ForeignKey(User, on_delete=models.CASCADE, related_name='contracts_as_clinic', verbose_name='Клиника')
    employer_bin = models.CharField(max_length=20, blank=True, null=True, verbose_name='БИН работодателя', help_text='БИН организации работодателя')
    employer_phone = models.CharField(max_length=20, blank=True, verbose_name='Телефон работодателя', help_text='Телефон для отправки уведомления')
    contract_number = models.CharField(max_length=100, verbose_name='Номер договора')
    contract_date = models.DateField(verbose_name='Дата договора')
    amount = models.DecimalField(max_digits=15, decimal_places=2, verbose_name='Сумма договора')
    people_count = models.IntegerField(verbose_name='Количество людей подлежащих медосмотру')
    execution_date = models.DateField(verbose_name='Дата исполнения договора')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name='Статус')
    scan_files = models.JSONField(default=list, blank=True, verbose_name='Скан-файлы договора', help_text='Список путей к файлам')
    notes = models.TextField(blank=True, verbose_name='Примечания')
    approved_by_employer_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата согласования работодателем')
    approved_by_clinic_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата согласования клиникой')
    sent_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата отправки')
    executed_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата исполнения')
    # Поля для двухэтапного исполнения договора
    execution_type = models.CharField(max_length=20, null=True, blank=True, choices=[
        ('full', 'Полное исполнение'),
        ('partial', 'Частичное исполнение'),
    ], verbose_name='Тип исполнения', help_text='Тип исполнения, указанный клиникой')
    executed_by_clinic_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата отметки исполнения клиникой')
    execution_notes = models.TextField(blank=True, verbose_name='Примечания к исполнению', help_text='Примечания клиники при отметке исполнения')
    confirmed_by_employer_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата подтверждения работодателем')
    employer_rejection_reason = models.TextField(blank=True, verbose_name='Причина отклонения работодателем', help_text='Причина отклонения исполнения работодателем')
    # Поля для субподряда
    SUBCONTRACT_STATUS_CHOICES = [
        ('pending', 'Ожидает подтверждения'),
        ('accepted', 'Принят'),
        ('rejected', 'Отклонен'),
    ]
    is_subcontracted = models.BooleanField(default=False, verbose_name='Передан на субподряд', help_text='Флаг указывающий что договор передан на субподряд')
    subcontract_status = models.CharField(max_length=20, choices=SUBCONTRACT_STATUS_CHOICES, null=True, blank=True, verbose_name='Статус субподряда')
    original_clinic = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='subcontracted_contracts', verbose_name='Оригинальная клиника', null=True, blank=True, help_text='Клиника, которая передала договор на субподряд')
    subcontractor_clinic = models.ForeignKey(User, on_delete=models.SET_NULL, related_name='subcontractor_contracts', verbose_name='Клиника-субподрядчик', null=True, blank=True, help_text='Клиника-субподрядчик, которая выполняет работу')
    subcontracted_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата передачи на субподряд')
    subcontract_accepted_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата принятия субподряда')
    subcontract_rejected_at = models.DateTimeField(null=True, blank=True, verbose_name='Дата отклонения субподряда')
    subcontract_rejection_reason = models.TextField(blank=True, verbose_name='Причина отклонения субподряда')
    subcontract_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, verbose_name='Сумма субподряда', help_text='Сумма, которую основная клиника платит субподрядчику')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата создания')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')
    
    class Meta:
        verbose_name = 'Договор'
        verbose_name_plural = 'Договоры'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['employer', 'clinic', 'status']),
            models.Index(fields=['contract_number']),
        ]
    
    def __str__(self):
        return f"Договор №{self.contract_number} от {self.contract_date} ({self.get_status_display()})"


class ContractHistory(models.Model):
    """История изменений договора для журналирования всех действий"""
    ACTION_CHOICES = [
        ('created', 'Создан'),
        ('updated', 'Обновлен'),
        ('sent_for_approval', 'Отправлен на согласование'),
        ('approved', 'Согласован'),
        ('rejected', 'Отклонен'),
        ('resent_for_approval', 'Повторно отправлен на согласование'),
        ('cancelled', 'Отменен'),
        ('executed', 'Исполнен'),
        ('subcontracted', 'Передан на субподряд'),
        ('employer_registered', 'Работодатель зарегистрировался'),
    ]
    
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='history', verbose_name='Договор')
    action = models.CharField(max_length=30, choices=ACTION_CHOICES, verbose_name='Действие')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name='Пользователь')
    user_role = models.CharField(max_length=20, blank=True, verbose_name='Роль пользователя')
    user_name = models.CharField(max_length=255, blank=True, verbose_name='Имя пользователя')
    comment = models.TextField(blank=True, verbose_name='Комментарий/Причина')
    old_status = models.CharField(max_length=20, blank=True, verbose_name='Старый статус')
    new_status = models.CharField(max_length=20, blank=True, verbose_name='Новый статус')
    changes = models.JSONField(default=dict, blank=True, verbose_name='Изменения', help_text='Детали изменений полей')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата и время')
    
    class Meta:
        verbose_name = 'История договора'
        verbose_name_plural = 'История договоров'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['contract', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_action_display()} - {self.contract.contract_number} ({self.created_at.strftime('%d.%m.%Y %H:%M')})"

