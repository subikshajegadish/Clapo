from django.db import models


class Profile(models.Model):
    EMPLOYMENT_STATUS_CHOICES = [
        ("student", "student"),
        ("employed", "employed"),
        ("unemployed", "unemployed"),
        ("self-employed", "self-employed"),
        ("retired", "retired"),
        ("other", "other"),
    ]

    owner_user_id = models.CharField(max_length=80, db_index=True)
    name = models.CharField(max_length=80)
    age = models.PositiveSmallIntegerField(null=True, blank=True)
    state = models.CharField(max_length=50, null=True, blank=True)
    employment_status = models.CharField(max_length=30, choices=EMPLOYMENT_STATUS_CHOICES)
    citizenship = models.CharField(max_length=120, null=True, blank=True)
    housing = models.CharField(max_length=120, null=True, blank=True)
    has_dependents = models.BooleanField(null=True, blank=True)
    dependents_count = models.PositiveSmallIntegerField(null=True, blank=True)
    university = models.CharField(max_length=120, null=True, blank=True)
    degree_level = models.CharField(max_length=120, null=True, blank=True)
    financial_aid = models.CharField(max_length=120, null=True, blank=True)
    industry = models.CharField(max_length=120, null=True, blank=True)
    employment_type = models.CharField(max_length=120, null=True, blank=True)
    income_bracket = models.CharField(max_length=120, null=True, blank=True)
    business_type = models.CharField(max_length=120, null=True, blank=True)
    num_employees = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return f"Profile(id={self.id}, owner={self.owner_user_id})"
