from django.urls import path

from analysis.views import AnalysesDetailView, AnalysesListView, AnalyzeView

urlpatterns = [
    path("analyze/", AnalyzeView.as_view(), name="analyze"),
    path("analyses/", AnalysesListView.as_view(), name="analyses-list"),
    path("analyses/<int:analysis_id>/", AnalysesDetailView.as_view(), name="analyses-detail"),
]
