from django.contrib import admin
from .models import (
    User, ContingentEmployee, CalendarPlan, RouteSheet, DoctorExamination, Expertise,
    EmergencyNotification, HealthImprovementPlan, RecommendationTracking, Doctor,
    LaboratoryTest, FunctionalTest, Referral, PatientQueue, Contract
)

# Настройка стандартного Django admin
admin.site.site_header = 'CRM Панель администратора'
admin.site.site_title = 'CRM Admin'
admin.site.index_title = 'Добро пожаловать в панель администратора'

# Регистрируем модели в стандартном admin
admin.site.register(User)
admin.site.register(ContingentEmployee)
admin.site.register(CalendarPlan)
admin.site.register(RouteSheet)
admin.site.register(DoctorExamination)
admin.site.register(Expertise)
admin.site.register(EmergencyNotification)
admin.site.register(HealthImprovementPlan)
admin.site.register(RecommendationTracking)
admin.site.register(Doctor)
admin.site.register(LaboratoryTest)
admin.site.register(FunctionalTest)
admin.site.register(Referral)
admin.site.register(PatientQueue)
admin.site.register(Contract)

