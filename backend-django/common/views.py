from rest_framework.response import Response
from rest_framework.views import APIView


class AuthMeView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        user = getattr(request, "user", None)
        if user is not None and getattr(user, "is_authenticated", False):
            return Response(
                {
                    "authenticated": True,
                    "user": {
                        "id": str(user.id),
                        "email": user.email or "",
                        "username": user.get_username() or "",
                    },
                }
            )
        return Response({"authenticated": False, "user": None})
