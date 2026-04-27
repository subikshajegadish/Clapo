from django.db import models


class AnalysisResult(models.Model):
    owner_user_id = models.CharField(max_length=80, db_index=True)
    profile = models.ForeignKey(
        "profiles.Profile", on_delete=models.CASCADE, related_name="analysis_results"
    )
    policy_hash = models.CharField(max_length=64, db_index=True)
    policy_preview = models.TextField(blank=True)
    result_json = models.JSONField()
    model_name = models.CharField(max_length=120, blank=True)
    confidence = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return f"AnalysisResult(id={self.id}, owner={self.owner_user_id}, profile={self.profile_id})"
