from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        return response

    if isinstance(exc, Http404):
        response.data = {
            "error": {
                "code": "NOT_FOUND",
                "message": "Resource not found",
                "details": [],
            }
        }
        return response

    if isinstance(exc, ValidationError):
        details = []
        data = response.data
        if isinstance(data, dict):
            for field, messages in data.items():
                msg_list = messages if isinstance(messages, list) else [messages]
                for message in msg_list:
                    details.append({"field": field, "message": str(message)})
        response.data = {
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request body",
                "details": details,
            }
        }
        return response

    if status.is_client_error(response.status_code) or status.is_server_error(response.status_code):
        detail = response.data.get("detail") if isinstance(response.data, dict) else None
        response.data = {
            "error": {
                "code": "REQUEST_FAILED",
                "message": str(detail) if detail else "Request failed",
                "details": [],
            }
        }

    return response
