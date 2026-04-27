from django.contrib import admin
from django.urls import include, path

from health.views import HealthView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", HealthView.as_view(), name="health"),
    path("", include("profiles.urls")),
    path("", include("analysis.urls")),
]
