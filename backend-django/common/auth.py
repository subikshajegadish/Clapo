def _validate_owner_id(value: str) -> str:
    owner_id = str(value).strip()
    if len(owner_id) < 1 or len(owner_id) > 80:
        raise ValueError("Owner id must be between 1 and 80 characters.")
    return owner_id


def get_current_owner_id(request) -> str:
    """
    Temporary auth bridge:
    - Prefer real authenticated Django user (request.user) when available.
    - Fall back to x-demo-user-id for local/demo development.
    This keeps current local behavior while preparing for OAuth-backed auth later.
    """
    user = getattr(request, "user", None)
    if user is not None and getattr(user, "is_authenticated", False):
        return _validate_owner_id(str(user.id))

    raw_header = request.META.get("HTTP_X_DEMO_USER_ID")
    if raw_header is None or str(raw_header).strip() == "":
        return "demo-user"
    return _validate_owner_id(str(raw_header))
