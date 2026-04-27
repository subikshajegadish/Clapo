from rest_framework import serializers

from .models import Profile


class ProfileSerializer(serializers.ModelSerializer):
    owner_user_id = serializers.CharField(read_only=True)

    class Meta:
        model = Profile
        fields = [
            "id",
            "owner_user_id",
            "name",
            "age",
            "state",
            "employment_status",
            "citizenship",
            "housing",
            "has_dependents",
            "dependents_count",
            "university",
            "degree_level",
            "financial_aid",
            "industry",
            "employment_type",
            "income_bracket",
            "business_type",
            "num_employees",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "owner_user_id", "created_at", "updated_at"]

    def to_internal_value(self, data):
        if isinstance(data, dict):
            normalized = dict(data)
            for key, value in normalized.items():
                if isinstance(value, str):
                    trimmed = value.strip()
                    normalized[key] = trimmed if trimmed else None
            data = normalized
        return super().to_internal_value(data)

    def validate_name(self, value):
        trimmed = value.strip()
        if not (1 <= len(trimmed) <= 80):
            raise serializers.ValidationError("Must be between 1 and 80 characters.")
        return trimmed

    def validate_age(self, value):
        if value is None:
            return value
        if value < 0 or value > 120:
            raise serializers.ValidationError("Must be between 0 and 120.")
        return value

    def validate_dependents_count(self, value):
        if value is None:
            return value
        if value < 0 or value > 20:
            raise serializers.ValidationError("Must be between 0 and 20.")
        return value

    def validate_num_employees(self, value):
        if value is None:
            return value
        if value < 0 or value > 100000:
            raise serializers.ValidationError("Must be between 0 and 100000.")
        return value

    def validate(self, attrs):
        if "owner_user_id" in attrs:
            attrs.pop("owner_user_id", None)
        return attrs
