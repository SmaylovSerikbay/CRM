from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),  # Стандартный Django admin
    path('api/', include('api.urls')),
]

