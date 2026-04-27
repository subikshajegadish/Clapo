from django.urls import path

from .views import ProfileDetailView, ProfilesListCreateView

urlpatterns = [
    path("profiles/", ProfilesListCreateView.as_view(), name="profiles-list-create"),
    path("profiles/<int:profile_id>/", ProfileDetailView.as_view(), name="profiles-detail"),
]
