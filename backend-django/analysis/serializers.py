from rest_framework import serializers

from analysis.models import AnalysisResult


class AnalyzeRequestSerializer(serializers.Serializer):
    profile_id = serializers.IntegerField(required=True, min_value=1)
    policy_text = serializers.CharField(required=True, allow_blank=False, trim_whitespace=True)

    def validate_policy_text(self, value: str) -> str:
        text = value.strip()
        if len(text) < 50 or len(text) > 120000:
            raise serializers.ValidationError("Must be between 50 and 120000 characters.")
        return text


class AnalysisResultListSerializer(serializers.ModelSerializer):
    profile_id = serializers.IntegerField(source="profile.id", read_only=True)
    policy_title = serializers.SerializerMethodField()
    overall_impact = serializers.SerializerMethodField()

    class Meta:
        model = AnalysisResult
        fields = [
            "id",
            "profile_id",
            "policy_title",
            "overall_impact",
            "confidence",
            "policy_preview",
            "model_name",
            "created_at",
        ]

    def get_policy_title(self, obj):
        return str((obj.result_json or {}).get("policy_title") or "")

    def get_overall_impact(self, obj):
        return str((obj.result_json or {}).get("overall_impact") or "")


class AnalysisResultDetailSerializer(serializers.ModelSerializer):
    profile_id = serializers.IntegerField(source="profile.id", read_only=True)

    class Meta:
        model = AnalysisResult
        fields = ["id", "profile_id", "result_json", "created_at"]
