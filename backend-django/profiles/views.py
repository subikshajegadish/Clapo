from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.auth import get_current_owner_id
from .errors import error_response
from .models import Profile
from .serializers import ProfileSerializer


class ProfilesListCreateView(APIView):
    def get(self, request):
        owner_user_id = get_current_owner_id(request)
        queryset = Profile.objects.filter(owner_user_id=owner_user_id)
        serializer = ProfileSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        owner_user_id = get_current_owner_id(request)
        serializer = ProfileSerializer(data=request.data)
        if not serializer.is_valid():
            details = []
            for field, messages in serializer.errors.items():
                msg_list = messages if isinstance(messages, list) else [messages]
                for message in msg_list:
                    details.append({"field": field, "message": str(message)})
            return error_response(
                "VALIDATION_ERROR",
                "Invalid request body",
                details,
                status.HTTP_400_BAD_REQUEST,
            )
        profile = serializer.save(owner_user_id=owner_user_id)
        out = ProfileSerializer(profile)
        return Response(out.data, status=status.HTTP_201_CREATED)


class ProfileDetailView(APIView):
    def get(self, request, profile_id: int):
        owner_user_id = get_current_owner_id(request)
        profile = get_object_or_404(Profile, id=profile_id, owner_user_id=owner_user_id)
        serializer = ProfileSerializer(profile)
        return Response(serializer.data)

    def delete(self, request, profile_id: int):
        owner_user_id = get_current_owner_id(request)
        profile = get_object_or_404(Profile, id=profile_id, owner_user_id=owner_user_id)
        profile.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
