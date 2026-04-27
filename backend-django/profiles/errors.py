from rest_framework import status
from rest_framework.response import Response


def error_response(code: str, message: str, details=None, status_code=status.HTTP_400_BAD_REQUEST):
    return Response(
        {
            "error": {
                "code": code,
                "message": message,
                "details": details or [],
            }
        },
        status=status_code,
    )
