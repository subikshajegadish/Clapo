from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from analysis.logging_utils import log_error, log_info, log_warn
from analysis.models import AnalysisResult
from analysis.rate_limit import check_and_consume
from analysis.serializers import (
    AnalysisResultDetailSerializer,
    AnalysisResultListSerializer,
    AnalyzeRequestSerializer,
)
from analysis.services import (
    AnalyzerDisabledError,
    AnalyzerServiceError,
    analyze_policy,
    policy_hash,
)
from profiles.demo_user import get_demo_user_id
from profiles.errors import error_response
from profiles.models import Profile


class AnalyzeView(APIView):
    @staticmethod
    def _apply_rate_limit_headers(response, rl_state):
        response["X-RateLimit-Limit"] = str(rl_state["limit"])
        response["X-RateLimit-Remaining"] = str(rl_state["remaining"])
        if rl_state.get("retry_after", 0) > 0:
            response["Retry-After"] = str(rl_state["retry_after"])
        return response

    def post(self, request):
        serializer = AnalyzeRequestSerializer(data=request.data)
        if not serializer.is_valid():
            details = []
            for field, messages in serializer.errors.items():
                msg_list = messages if isinstance(messages, list) else [messages]
                for message in msg_list:
                    details.append({"field": field, "message": str(message)})
            return error_response("VALIDATION_ERROR", "Invalid request body", details, status.HTTP_400_BAD_REQUEST)

        profile_id = serializer.validated_data["profile_id"]
        policy_text = serializer.validated_data["policy_text"]
        owner_user_id = get_demo_user_id(request)
        rl_state = check_and_consume(owner_user_id)
        if not rl_state["allowed"]:
            log_warn(
                "analyze.rate_limited",
                {
                    "owner_user_id": owner_user_id,
                    "profile_id": profile_id,
                    "outcome": "rate_limited",
                    "retry_after": rl_state["retry_after"],
                },
            )
            response = error_response(
                "RATE_LIMITED",
                "Too many analysis requests. Please try again later.",
                [],
                status.HTTP_429_TOO_MANY_REQUESTS,
            )
            return self._apply_rate_limit_headers(response, rl_state)

        meta = {
            "profile_id": profile_id,
            "owner_user_id": owner_user_id,
            "policy_text_length": len(policy_text),
        }
        log_info("analyze.start", meta)

        try:
            profile = Profile.objects.get(id=profile_id, owner_user_id=owner_user_id)
        except Profile.DoesNotExist:
            log_warn("analyze.profile_not_found", {**meta, "outcome": "profile_not_found"})
            response = error_response("PROFILE_NOT_FOUND", "Profile not found", [], status.HTTP_404_NOT_FOUND)
            return self._apply_rate_limit_headers(response, rl_state)

        phash = policy_hash(policy_text)
        cached_result = (
            AnalysisResult.objects.filter(
                owner_user_id=owner_user_id,
                profile=profile,
                policy_hash=phash,
            )
            .order_by("-created_at", "-id")
            .first()
        )
        if cached_result is not None:
            cached_payload = dict(cached_result.result_json or {})
            cached_payload["cached"] = True
            log_info(
                "analyze.cache_hit",
                {
                    "profile_id": profile_id,
                    "owner_user_id": owner_user_id,
                    "policy_hash_prefix": phash[:8],
                    "cached": True,
                    "outcome": "ok",
                },
            )
            response = Response(cached_payload, status=status.HTTP_200_OK)
            return self._apply_rate_limit_headers(response, rl_state)

        try:
            analyzed, model, evidence_count, unverified_count, fallback_used, attempt_count = analyze_policy(
                profile, policy_text
            )
            stored = AnalysisResult.objects.create(
                owner_user_id=owner_user_id,
                profile=profile,
                policy_hash=phash,
                policy_preview=policy_text[:500],
                result_json=analyzed,
                model_name=model,
                confidence=analyzed.get("confidence"),
            )
            log_info(
                "analyze.success",
                {
                    **meta,
                    "analysis_result_id": stored.id,
                    "model": model,
                    "policy_hash_prefix": phash[:8],
                    "cached": False,
                    "fallback_used": fallback_used,
                    "attempt_count": attempt_count,
                    "section_count": len(analyzed.get("sections", [])),
                    "evidence_count": evidence_count,
                    "unverified_evidence_count": unverified_count,
                    "outcome": "ok",
                },
            )
            response_payload = dict(analyzed)
            response_payload["cached"] = False
            response = Response(response_payload, status=status.HTTP_200_OK)
            return self._apply_rate_limit_headers(response, rl_state)
        except AnalyzerDisabledError:
            log_warn("analyze.disabled", {**meta, "outcome": "disabled"})
            response = error_response(
                "ANALYZER_DISABLED",
                "LLM analyzer is disabled",
                [],
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )
            return self._apply_rate_limit_headers(response, rl_state)
        except AnalyzerServiceError as exc:
            log_error(
                "analyze.failure",
                {
                    **meta,
                    "outcome": "error",
                    "error_code": exc.error_code,
                    "message": exc.client_message,
                },
            )
            response = error_response(
                exc.error_code,
                exc.client_message,
                [],
                exc.status_code,
            )
            return self._apply_rate_limit_headers(response, rl_state)


class AnalysesListView(APIView):
    def get(self, request):
        owner_user_id = get_demo_user_id(request)
        queryset = AnalysisResult.objects.filter(owner_user_id=owner_user_id)
        serializer = AnalysisResultListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AnalysesDetailView(APIView):
    def get(self, request, analysis_id: int):
        owner_user_id = get_demo_user_id(request)
        try:
            result = AnalysisResult.objects.get(id=analysis_id, owner_user_id=owner_user_id)
        except AnalysisResult.DoesNotExist:
            return error_response("NOT_FOUND", "Analysis not found", [], status.HTTP_404_NOT_FOUND)
        serializer = AnalysisResultDetailSerializer(result)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, analysis_id: int):
        owner_user_id = get_demo_user_id(request)
        try:
            result = AnalysisResult.objects.get(id=analysis_id, owner_user_id=owner_user_id)
        except AnalysisResult.DoesNotExist:
            return error_response("NOT_FOUND", "Analysis not found", [], status.HTTP_404_NOT_FOUND)
        result.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
