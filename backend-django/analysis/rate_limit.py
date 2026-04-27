import math
import threading
import time
from collections import defaultdict, deque


# In-memory limiter is acceptable for a local prototype.
# Production should use Redis/distributed rate limiting across instances.
WINDOW_SECONDS = 10 * 60
MAX_REQUESTS = 5
_LOCK = threading.Lock()
_REQUEST_TIMES = defaultdict(deque)


def check_and_consume(user_id: str):
    now = time.time()
    with _LOCK:
        bucket = _REQUEST_TIMES[user_id]
        cutoff = now - WINDOW_SECONDS
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()

        if len(bucket) >= MAX_REQUESTS:
            retry_after = max(1, int(math.ceil(bucket[0] + WINDOW_SECONDS - now)))
            return {
                "allowed": False,
                "limit": MAX_REQUESTS,
                "remaining": 0,
                "retry_after": retry_after,
            }

        bucket.append(now)
        remaining = max(0, MAX_REQUESTS - len(bucket))
        return {
            "allowed": True,
            "limit": MAX_REQUESTS,
            "remaining": remaining,
            "retry_after": 0,
        }
