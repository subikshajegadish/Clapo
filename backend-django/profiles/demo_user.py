from django.http import JsonResponse


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


def get_demo_user_id(request) -> str:
    return getattr(request, "demo_user_id", "demo-user")


class DemoUserMiddleware:
    HEADER = "HTTP_X_DEMO_USER_ID"
    DEFAULT_USER = "demo-user"
    MAX_LEN = 80

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        raw = request.META.get(self.HEADER, "")
        user_id = str(raw).strip() if raw is not None else ""
        if not user_id:
            user_id = self.DEFAULT_USER
        if len(user_id) < 1 or len(user_id) > self.MAX_LEN:
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
        request.demo_user_id = user_id
        return self.get_response(request)
