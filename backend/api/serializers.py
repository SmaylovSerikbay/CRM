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
    def validate_iin(self, value):
        """Валидация ИИН: должен содержать ровно 12 цифр или быть пустым"""
        if value:
            cleaned = ''.join(filter(str.isdigit, str(value)))
            if len(cleaned) != 12:
                raise serializers.ValidationError('ИИН должен содержать ровно 12 цифр')
            return cleaned
        return value
    
    class Meta:
        model = ContingentEmployee
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'user')
        read_only_fields = ['id', 'created_at']


class CalendarPlanSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(read_only=True)
    harmful_factors = serializers.JSONField(required=False, allow_null=True)
    selected_doctors = serializers.JSONField(required=False, allow_null=True)
    
    class Meta:
        model = CalendarPlan
        fields = ['id', 'user', 'department', 'start_date', 'end_date', 'employee_ids', 'harmful_factors', 'selected_doctors', 'status',
                  'clinic_name', 'clinic_director', 'employer_name', 'employer_representative',
                  'ses_representative', 'created_at', 'approved_by_clinic_at', 'approved_by_employer_at', 'sent_to_ses_at']
        read_only_fields = ['id', 'created_at']


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
    employer_name = serializers.CharField(source='employer.registration_data.name', read_only=True, allow_null=True)
    clinic_name = serializers.CharField(source='clinic.registration_data.name', read_only=True, allow_null=True)
    employer_bin = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    employer_phone = serializers.CharField(required=False, allow_blank=True)
    employer = serializers.PrimaryKeyRelatedField(required=False, allow_null=True, queryset=User.objects.filter(role='employer'), write_only=False)
    clinic = serializers.PrimaryKeyRelatedField(required=False, allow_null=True, queryset=User.objects.filter(role='clinic'), write_only=False)
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
        read_only_fields = ['id', 'created_at', 'updated_at', 'approved_by_employer_at', 'approved_by_clinic_at', 'sent_at', 'executed_at']
        extra_kwargs = {
            'employer': {'required': False, 'allow_null': True},
            'clinic': {'required': False, 'allow_null': True},
        }
