from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, ContingentEmployeeViewSet, CalendarPlanViewSet,
    RouteSheetViewSet, DoctorExaminationViewSet, ExpertiseViewSet,
    EmergencyNotificationViewSet, HealthImprovementPlanViewSet, RecommendationTrackingViewSet,
    DoctorViewSet, LaboratoryTestViewSet, FunctionalTestViewSet, ReferralViewSet,
    PatientQueueViewSet, ContractViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'contingent-employees', ContingentEmployeeViewSet, basename='contingent-employee')
router.register(r'calendar-plans', CalendarPlanViewSet, basename='calendar-plan')
router.register(r'route-sheets', RouteSheetViewSet, basename='route-sheet')
router.register(r'examinations', DoctorExaminationViewSet, basename='examination')
router.register(r'expertises', ExpertiseViewSet, basename='expertise')
router.register(r'emergency-notifications', EmergencyNotificationViewSet, basename='emergency-notification')
router.register(r'health-improvement-plans', HealthImprovementPlanViewSet, basename='health-improvement-plan')
router.register(r'recommendations', RecommendationTrackingViewSet, basename='recommendation')
router.register(r'doctors', DoctorViewSet, basename='doctor')
router.register(r'laboratory-tests', LaboratoryTestViewSet, basename='laboratory-test')
router.register(r'functional-tests', FunctionalTestViewSet, basename='functional-test')
router.register(r'referrals', ReferralViewSet, basename='referral')
router.register(r'patient-queue', PatientQueueViewSet, basename='patient-queue')
router.register(r'contracts', ContractViewSet, basename='contract')

urlpatterns = [
    path('', include(router.urls)),
]

