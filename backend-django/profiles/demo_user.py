from django.http import JsonResponse

from common.auth import get_current_owner_id


def _error(code: str, message: str, details=None, status_code: int = 400):
    return JsonResponse(
        {
            "error": {
                "code": code,
                "message": message,
                "details": details or [],
            }
        },
        status=status_code,
    )


class DemoUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            owner_id = get_current_owner_id(request)
        except ValueError:
            return _error(
                "VALIDATION_ERROR",
                "Invalid request header",
                [
                    {
                        "field": "x-demo-user-id",
                        "message": "Must be between 1 and 80 characters.",
                    }
                ],
            )
        # request.owner_user_id centralizes identity access across apps.
        request.owner_user_id = owner_id
        return self.get_response(request)
