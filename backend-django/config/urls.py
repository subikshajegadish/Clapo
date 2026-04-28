from django.contrib import admin
from django.urls import include, path

from common.views import AuthMeView
from health.views import HealthView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", HealthView.as_view(), name="health"),
    path("auth/", include("dj_rest_auth.urls")),
    path("auth/registration/", include("dj_rest_auth.registration.urls")),
    path("auth/me/", AuthMeView.as_view(), name="auth-me"),
    path("", include("profiles.urls")),
    path("", include("analysis.urls")),
]
