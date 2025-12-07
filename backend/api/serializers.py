from rest_framework import serializers
from .models import (
    User, ContingentEmployee, CalendarPlan, RouteSheet, DoctorExamination, Expertise,
    EmergencyNotification, HealthImprovementPlan, RecommendationTracking, Doctor,
    LaboratoryTest, FunctionalTest, Referral, PatientQueue, Contract, ContractHistory
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'phone', 'role', 'clinic_role', 'registration_completed', 'registration_data', 'created_at', 'last_login_at']
        read_only_fields = ['id', 'created_at', 'last_login_at']


class ContingentEmployeeSerializer(serializers.ModelSerializer):
    contract_number = serializers.SerializerMethodField()
    employer_name = serializers.SerializerMethodField()
    route_sheet_info = serializers.SerializerMethodField()
    
    def validate_iin(self, value):
        """Валидация ИИН: должен содержать ровно 12 цифр или быть пустым"""
        if value:
            cleaned = ''.join(filter(str.isdigit, str(value)))
            if len(cleaned) != 12:
                raise serializers.ValidationError('ИИН должен содержать ровно 12 цифр')
            return cleaned
        return value
    
    def get_contract_number(self, obj):
        if obj.contract:
            return obj.contract.contract_number
        return None
    
    def get_employer_name(self, obj):
        if obj.contract:
            if obj.contract.employer:
                return obj.contract.employer.registration_data.get('name') if obj.contract.employer.registration_data else None
            # Если employer не установлен, возвращаем None (имя можно получить только из связанного пользователя)
            return None
        return None
    
    def get_route_sheet_info(self, obj):
        """Получение информации о маршрутных листах для сотрудника"""
        from .models import RouteSheet, Doctor
        
        # Находим все маршрутные листы для этого сотрудника
        route_sheets = RouteSheet.objects.filter(patient_id=str(obj.id)).order_by('-visit_date')
        
        if not route_sheets.exists():
            return None
        
        # Берем последний (самый актуальный) маршрутный лист
        latest_route_sheet = route_sheets.first()
        
        # Получаем информацию о врачах из услуг
        doctors_info = []
        services = latest_route_sheet.services if isinstance(latest_route_sheet.services, list) else []
        
        for service in services:
            doctor_id = service.get('doctorId') or service.get('doctor_id', '')
            if doctor_id:
                try:
                    doctor = Doctor.objects.get(id=doctor_id)
                    doctors_info.append({
                        'name': doctor.name,
                        'specialization': doctor.specialization,
                        'cabinet': doctor.cabinet or service.get('cabinet', ''),
                        'time': service.get('time', ''),
                    })
                except Doctor.DoesNotExist:
                    # Если врач не найден, используем данные из услуги
                    doctors_info.append({
                        'name': service.get('name', ''),
                        'specialization': service.get('specialization', service.get('name', '')),
                        'cabinet': service.get('cabinet', ''),
                        'time': service.get('time', ''),
                    })
        
        # Определяем время начала и конца
        times = [s.get('time', '') for s in services if s.get('time')]
        time_range = None
        if times:
            sorted_times = sorted([t for t in times if t])
            if sorted_times:
                time_range = f"{sorted_times[0]} - {sorted_times[-1]}"
        
        return {
            'visit_date': latest_route_sheet.visit_date.isoformat() if latest_route_sheet.visit_date else None,
            'time_range': time_range,
            'doctors': doctors_info,
            'services_count': len(services),
        }
    
    class Meta:
        model = ContingentEmployee
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'contract_number', 'employer_name', 'route_sheet_info']


class CalendarPlanSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(read_only=True)
    harmful_factors = serializers.JSONField(required=False, allow_null=True)
    selected_doctors = serializers.JSONField(required=False, allow_null=True)
    departments_info = serializers.JSONField(required=False, allow_null=True)
    contract_number = serializers.SerializerMethodField()
    employer_name_field = serializers.SerializerMethodField()
    
    def get_contract_number(self, obj):
        if obj.contract:
            return obj.contract.contract_number
        return None
    
    def get_employer_name_field(self, obj):
        if obj.contract and obj.contract.employer:
            return obj.contract.employer.registration_data.get('name') if obj.contract.employer.registration_data else None
        return None
    
    class Meta:
        model = CalendarPlan
        fields = ['id', 'user', 'contract', 'contract_number', 'department', 'start_date', 'end_date', 'employee_ids', 'departments_info', 'harmful_factors', 'selected_doctors', 'status',
                  'clinic_name', 'clinic_director', 'employer_name', 'employer_representative',
                  'ses_representative', 'created_at', 'approved_by_clinic_at', 'approved_by_employer_at', 'sent_to_ses_at', 'employer_name_field']
        read_only_fields = ['id', 'created_at', 'contract_number', 'employer_name_field']


class RouteSheetSerializer(serializers.ModelSerializer):
    services = serializers.JSONField()
    
    def validate_iin(self, value):
        """Валидация ИИН: должен содержать ровно 12 цифр"""
        if value:
            cleaned = ''.join(filter(str.isdigit, str(value)))
            if len(cleaned) != 12:
                raise serializers.ValidationError('ИИН должен содержать ровно 12 цифр')
            return cleaned
        return value
    
    class Meta:
        model = RouteSheet
        fields = ['id', 'patient_id', 'patient_name', 'iin', 'position', 'department', 'visit_date', 'services', 'created_at']
        read_only_fields = ['id', 'created_at']


class DoctorExaminationSerializer(serializers.ModelSerializer):
    examination_date = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = DoctorExamination
        fields = ['id', 'patient_id', 'doctor_id', 'doctor_name', 'specialization', 'conclusion',
                  'notes', 'examination_date', 'doctor_signature', 'recommendations']
        read_only_fields = ['id', 'examination_date']


class ExpertiseSerializer(serializers.ModelSerializer):
    doctor_conclusions = serializers.JSONField()
    final_verdict = serializers.CharField(allow_null=True)
    verdict_date = serializers.DateTimeField(read_only=True, allow_null=True)
    temporary_unfit_until = serializers.DateField(allow_null=True)
    
    def validate_iin(self, value):
        """Валидация ИИН: должен содержать ровно 12 цифр"""
        if value:
            cleaned = ''.join(filter(str.isdigit, str(value)))
            if len(cleaned) != 12:
                raise serializers.ValidationError('ИИН должен содержать ровно 12 цифр')
            return cleaned
        return value
    
    class Meta:
        model = Expertise
        fields = ['id', 'patient_id', 'patient_name', 'iin', 'position', 'department',
                  'doctor_conclusions', 'final_verdict', 'health_group', 'verdict_date', 'profpathologist_name',
                  'profpathologist_signature', 'temporary_unfit_until', 'reason', 'requires_referral',
                  'referral_type', 'referral_sent', 'referral_date', 'created_at']
        read_only_fields = ['id', 'created_at']


class EmergencyNotificationSerializer(serializers.ModelSerializer):
    def validate_iin(self, value):
        """Валидация ИИН: должен содержать ровно 12 цифр"""
        if value:
            cleaned = ''.join(filter(str.isdigit, str(value)))
            if len(cleaned) != 12:
                raise serializers.ValidationError('ИИН должен содержать ровно 12 цифр')
            return cleaned
        return value
    
    class Meta:
        model = EmergencyNotification
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class HealthImprovementPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthImprovementPlan
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class RecommendationTrackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecommendationTracking
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class DoctorSerializer(serializers.ModelSerializer):
    work_schedule = serializers.JSONField(required=False, allow_null=True)
    cabinet = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    user = serializers.PrimaryKeyRelatedField(read_only=True)
    iin = serializers.CharField(required=False, allow_blank=True, max_length=20)
    phone = serializers.CharField(required=False, allow_blank=True, max_length=20)
    
    def validate_iin(self, value):
        """Валидация ИИН: должен содержать ровно 12 цифр"""
        if value:
            cleaned = ''.join(filter(str.isdigit, value))
            if len(cleaned) != 12:
                raise serializers.ValidationError('ИИН должен содержать ровно 12 цифр')
            return cleaned
        return value
    
    def validate_phone(self, value):
        """Валидация телефона: казахстанский формат"""
        if value:
            cleaned = ''.join(filter(str.isdigit, value))
            # Проверяем казахстанский формат: начинается с 7 или 8, затем 10 цифр, или просто 10 цифр
            if cleaned.startswith('8') and len(cleaned) == 11:
                return f"8 {cleaned[1:4]} {cleaned[4:7]} {cleaned[7:11]}"
            elif cleaned.startswith('7') and len(cleaned) == 11:
                return f"+7 {cleaned[1:4]} {cleaned[4:7]} {cleaned[7:11]}"
            elif len(cleaned) == 10:
                return f"+7 {cleaned[0:3]} {cleaned[3:6]} {cleaned[6:10]}"
            elif len(cleaned) == 11:
                # Если начинается не с 7 или 8, но 11 цифр - добавляем +7
                return f"+7 {cleaned[1:4]} {cleaned[4:7]} {cleaned[7:11]}"
            else:
                raise serializers.ValidationError('Неверный формат телефона. Используйте формат: +7 777 123 4567 или 8 777 123 4567')
        return value
    
    class Meta:
        model = Doctor
        fields = ['id', 'user', 'name', 'specialization', 'cabinet', 'work_schedule', 'iin', 'phone', 'email', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class LaboratoryTestSerializer(serializers.ModelSerializer):
    results = serializers.JSONField(required=False, allow_null=True)
    
    class Meta:
        model = LaboratoryTest
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class FunctionalTestSerializer(serializers.ModelSerializer):
    results = serializers.JSONField(required=False, allow_null=True)
    
    class Meta:
        model = FunctionalTest
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class ReferralSerializer(serializers.ModelSerializer):
    def validate_iin(self, value):
        """Валидация ИИН: должен содержать ровно 12 цифр"""
        if value:
            cleaned = ''.join(filter(str.isdigit, str(value)))
            if len(cleaned) != 12:
                raise serializers.ValidationError('ИИН должен содержать ровно 12 цифр')
            return cleaned
        return value
    
    class Meta:
        model = Referral
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class PatientQueueSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)
    doctor_specialization = serializers.CharField(source='doctor.specialization', read_only=True)
    
    def validate_iin(self, value):
        """Валидация ИИН: должен содержать ровно 12 цифр или быть пустым"""
        if value:
            cleaned = ''.join(filter(str.isdigit, str(value)))
            if len(cleaned) != 12:
                raise serializers.ValidationError('ИИН должен содержать ровно 12 цифр')
            return cleaned
        return value
    
    class Meta:
        model = PatientQueue
        fields = '__all__'
        read_only_fields = ['id', 'queue_number', 'added_at', 'called_at', 'started_at', 'completed_at']


class ContractHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractHistory
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class ContractSerializer(serializers.ModelSerializer):
    scan_files = serializers.JSONField(required=False, allow_null=True, default=list)
    employer_name = serializers.SerializerMethodField()
    # clinic_name показывает оригинальную клинику для работодателя, даже если договор передан на субподряд
    clinic_name = serializers.SerializerMethodField()
    original_clinic_name = serializers.SerializerMethodField()
    subcontractor_clinic_name = serializers.SerializerMethodField()
    # amount, employer_bin, employer_phone - обычные поля, но с кастомной логикой чтения через to_representation
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=True)
    employer_bin = serializers.CharField(max_length=12, required=False, allow_blank=True)
    employer_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    
    def get_clinic_name(self, obj):
        # Если договор передан на субподряд, показываем оригинальную клинику
        # чтобы работодатель всегда видел клинику, с которой он заключал договор
        try:
            if obj.is_subcontracted and obj.original_clinic:
                if obj.original_clinic.registration_data and isinstance(obj.original_clinic.registration_data, dict):
                    return obj.original_clinic.registration_data.get('name', '')
                return ''
            # Иначе показываем текущую клинику
            if obj.clinic and obj.clinic.registration_data and isinstance(obj.clinic.registration_data, dict):
                return obj.clinic.registration_data.get('name', '')
            return ''
        except (AttributeError, TypeError):
            return ''
    
    def get_employer_name(self, obj):
        """Получаем имя работодателя"""
        try:
            if obj.employer and obj.employer.registration_data and isinstance(obj.employer.registration_data, dict):
                return obj.employer.registration_data.get('name', '')
            return None
        except (AttributeError, TypeError):
            return None
    
    def get_original_clinic_name(self, obj):
        """Получаем имя оригинальной клиники"""
        try:
            if obj.original_clinic and obj.original_clinic.registration_data and isinstance(obj.original_clinic.registration_data, dict):
                return obj.original_clinic.registration_data.get('name', '')
            return None
        except (AttributeError, TypeError):
            return None
    
    def get_subcontractor_clinic_name(self, obj):
        """Получаем имя клиники-субподрядчика"""
        try:
            if obj.subcontractor_clinic and obj.subcontractor_clinic.registration_data and isinstance(obj.subcontractor_clinic.registration_data, dict):
                return obj.subcontractor_clinic.registration_data.get('name', '')
            return None
        except (AttributeError, TypeError):
            return None
    
    def to_representation(self, instance):
        """Кастомная логика для скрытия данных от субподрядчика"""
        data = super().to_representation(instance)
        request = self.context.get('request')
        
        if request:
            # Получаем user_id из query params
            user_id = request.query_params.get('user_id')
            if user_id:
                try:
                    from .models import User
                    user = User.objects.get(id=user_id)
                    # Если пользователь - субподрядчик, скрываем конфиденциальные данные
                    if instance.is_subcontracted and instance.subcontractor_clinic and user.id == instance.subcontractor_clinic.id:
                        data['amount'] = None
                        data['employer_bin'] = None
                        data['employer_phone'] = None
                        data['employer_name'] = None
                except:
                    pass
        
        return data
    employer = serializers.PrimaryKeyRelatedField(required=False, allow_null=True, queryset=User.objects.filter(role='employer'), write_only=False)
    clinic = serializers.PrimaryKeyRelatedField(required=False, allow_null=True, queryset=User.objects.filter(role='clinic'), write_only=False)
    original_clinic = serializers.PrimaryKeyRelatedField(required=False, allow_null=True, queryset=User.objects.filter(role='clinic'), write_only=False)
    subcontractor_clinic = serializers.PrimaryKeyRelatedField(required=False, allow_null=True, queryset=User.objects.filter(role='clinic'), write_only=False)
    history = ContractHistorySerializer(many=True, read_only=True)
    
    def validate_employer_bin(self, value):
        """Валидация БИН: должен содержать ровно 12 цифр"""
        if value:
            cleaned = ''.join(filter(str.isdigit, str(value)))
            if len(cleaned) != 12:
                raise serializers.ValidationError('БИН должен содержать ровно 12 цифр')
            return cleaned
        return value
    
    class Meta:
        model = Contract
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'approved_by_employer_at', 'approved_by_clinic_at', 'sent_at', 'executed_at', 'subcontracted_at', 'subcontract_accepted_at', 'subcontract_rejected_at', 'executed_by_clinic_at', 'confirmed_by_employer_at']
        extra_kwargs = {
            'employer': {'required': False, 'allow_null': True},
            'clinic': {'required': False, 'allow_null': True},
            'original_clinic': {'required': False, 'allow_null': True},
            'subcontractor_clinic': {'required': False, 'allow_null': True},
        }
