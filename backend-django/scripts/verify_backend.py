#!/usr/bin/env python3
import json
import os
import sys
import time
import urllib.error
import urllib.request

BASE = os.getenv("BASE", "http://127.0.0.1:8000")


def step(msg):
    print(f"[STEP] {msg}")


def ok(msg):
    print(f"[PASS] {msg}")


def fail(msg):
    print(f"[FAIL] {msg}")
    raise RuntimeError(msg)


def request_json(method, path, headers=None, body=None):
    req_headers = {"Accept": "application/json"}
    if headers:
        req_headers.update(headers)

    data = None
    if body is not None:
        req_headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")

    req = urllib.request.Request(
        url=f"{BASE}{path}",
        data=data,
        headers=req_headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8")
            parsed = json.loads(raw) if raw else None
            return resp.status, parsed
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        parsed = json.loads(raw) if raw else None
        return e.code, parsed


def request_json_with_headers(method, path, headers=None, body=None):
    req_headers = {"Accept": "application/json"}
    if headers:
        req_headers.update(headers)

    data = None
    if body is not None:
        req_headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")

    req = urllib.request.Request(
        url=f"{BASE}{path}",
        data=data,
        headers=req_headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8")
            parsed = json.loads(raw) if raw else None
            return resp.status, parsed, dict(resp.headers)
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        parsed = json.loads(raw) if raw else None
        return e.code, parsed, dict(e.headers)


def assert_true(cond, message):
    if not cond:
        fail(message)


def main():
    run_suffix = str(int(time.time() * 1000))
    verify_headers = {"x-demo-user-id": f"verify-user-{run_suffix}"}
    other_headers = {"x-demo-user-id": f"other-user-{run_suffix}"}

    step("Health route is reachable")
    status_code, body = request_json("GET", "/health/")
    assert_true(status_code == 200, f"/health/ expected 200, got {status_code}")
    assert_true(isinstance(body, dict) and body.get("status") == "ok", "Health body should be {'status':'ok'}")
    ok("Health check")

    step("Create profile as verify-user")
    create_payload = {
        "name": "Verify User",
        "age": 25,
        "state": "Maryland",
        "employment_status": "student",
        "university": "University of Maryland",
    }
    status_code, created = request_json("POST", "/profiles/", headers=verify_headers, body=create_payload)
    assert_true(status_code == 201, f"POST /profiles/ expected 201, got {status_code}")
    assert_true(created and created.get("id") is not None, "Created profile must include id")
    created_id = created["id"]
    ok("Create profile")

    step("List profiles as verify-user contains created profile")
    status_code, verify_list = request_json("GET", "/profiles/", headers=verify_headers)
    assert_true(status_code == 200, f"GET /profiles/ verify-user expected 200, got {status_code}")
    assert_true(
        isinstance(verify_list, list) and any(p.get("id") == created_id for p in verify_list),
        "verify-user should see created profile",
    )
    ok("Ownership list for verify-user")

    step("List profiles as other-user does not contain verify-user profile")
    status_code, other_list = request_json("GET", "/profiles/", headers=other_headers)
    assert_true(status_code == 200, f"GET /profiles/ other-user expected 200, got {status_code}")
    assert_true(
        isinstance(other_list, list) and not any(p.get("id") == created_id for p in other_list),
        "other-user must not see verify-user profile",
    )
    ok("Ownership list isolation for other-user")

    step("Fetch verify-user profile as other-user returns 404")
    status_code, not_found = request_json("GET", f"/profiles/{created_id}/", headers=other_headers)
    assert_true(status_code == 404, f"GET /profiles/<id>/ as other-user expected 404, got {status_code}")
    assert_true(
        isinstance(not_found, dict) and isinstance(not_found.get("error"), dict),
        "404 should use error JSON envelope",
    )
    ok("Cross-user detail access blocked")

    step("Analyze invalid payload returns 400")
    status_code, invalid_analyze = request_json(
        "POST",
        "/analyze/",
        headers=verify_headers,
        body={"profile_id": 0, "policy_text": "too short"},
    )
    assert_true(status_code == 400, f"POST /analyze/ invalid expected 400, got {status_code}")
    assert_true(
        isinstance(invalid_analyze, dict) and isinstance(invalid_analyze.get("error"), dict),
        "Invalid analyze should return error JSON envelope",
    )
    ok("Analyze invalid payload")

    step("Analyze other-user using verify profile returns 404")
    valid_policy = (
        "This policy provides an annual tax credit for renters under a certain income threshold, "
        "offers partial tuition grants for qualifying students, and includes support for job training."
    )
    status_code, cross_user_analyze = request_json(
        "POST",
        "/analyze/",
        headers=other_headers,
        body={"profile_id": created_id, "policy_text": valid_policy},
    )
    if status_code == 404:
        assert_true(
            isinstance(cross_user_analyze, dict) and isinstance(cross_user_analyze.get("error"), dict),
            "Cross-user analyze should return error JSON envelope",
        )
        ok("Analyze cross-user ownership guard")
    elif status_code == 429:
        # Possible when local in-memory limiter has residual state in long-lived dev server process.
        assert_true(
            isinstance(cross_user_analyze, dict) and cross_user_analyze.get("error", {}).get("code") == "RATE_LIMITED",
            "429 analyze response should use RATE_LIMITED envelope",
        )
        ok("Analyze cross-user request rate-limited (still no data leak)")
    else:
        fail(f"POST /analyze/ cross-user expected 404 or 429, got {status_code}")

    step("Analyze behavior for disabled/enabled LLM mode")
    analysis_id = None
    status_code, analyze_response = request_json(
        "POST",
        "/analyze/",
        headers=verify_headers,
        body={"profile_id": created_id, "policy_text": valid_policy},
    )
    if status_code == 503:
        assert_true(
            isinstance(analyze_response, dict)
            and analyze_response.get("error", {}).get("code") == "ANALYZER_DISABLED",
            "Disabled analyzer should return ANALYZER_DISABLED",
        )
        ok("Analyze returns 503 when LLM analyzer disabled")
    elif status_code == 200:
        required_fields = [
            "policy_title",
            "summary",
            "overall_impact",
            "confidence",
            "missing_information",
            "assumptions",
            "sections",
            "cached",
        ]
        assert_true(isinstance(analyze_response, dict), "Enabled analyzer response must be object")
        for key in required_fields:
            assert_true(key in analyze_response, f"Enabled analyzer response missing key: {key}")
        assert_true(analyze_response.get("cached") is False, "First analyze call should return cached=false")

        status_code, cached_response = request_json(
            "POST",
            "/analyze/",
            headers=verify_headers,
            body={"profile_id": created_id, "policy_text": valid_policy},
        )
        assert_true(status_code == 200, f"Second POST /analyze/ expected 200, got {status_code}")
        assert_true(
            isinstance(cached_response, dict) and cached_response.get("cached") is True,
            "Second analyze call should return cached=true for same user/profile/policy",
        )
        status_code, analyses_list = request_json("GET", "/analyses/", headers=verify_headers)
        assert_true(status_code == 200, f"GET /analyses/ expected 200, got {status_code}")
        assert_true(isinstance(analyses_list, list) and len(analyses_list) > 0, "Expected analysis history entry")
        first = analyses_list[0]
        analysis_id = first.get("id")
        assert_true(first.get("profile_id") == created_id, "History entry should reference created profile")
        assert_true(isinstance(analysis_id, int), "History entry should include id")

        status_code, analysis_detail = request_json(
            "GET",
            f"/analyses/{analysis_id}/",
            headers=verify_headers,
        )
        assert_true(status_code == 200, f"GET /analyses/<id>/ expected 200, got {status_code}")
        assert_true(
            isinstance(analysis_detail, dict) and isinstance(analysis_detail.get("result_json"), dict),
            "Analysis detail should include result_json",
        )

        status_code, other_list = request_json("GET", "/analyses/", headers=other_headers)
        assert_true(status_code == 200, f"GET /analyses/ other-user expected 200, got {status_code}")
        assert_true(
            isinstance(other_list, list) and not any(item.get("id") == analysis_id for item in other_list),
            "other-user must not see verify-user analysis",
        )

        status_code, _ = request_json("GET", f"/analyses/{analysis_id}/", headers=other_headers)
        assert_true(status_code == 404, f"GET /analyses/<id>/ cross-user expected 404, got {status_code}")
        status_code, _ = request_json("DELETE", f"/analyses/{analysis_id}/", headers=other_headers)
        assert_true(status_code == 404, f"DELETE /analyses/<id>/ cross-user expected 404, got {status_code}")
        ok("Analyze returns expected shape when LLM analyzer enabled")
    elif status_code == 502:
        assert_true(
            isinstance(analyze_response, dict) and isinstance(analyze_response.get("error"), dict),
            "Upstream analyze failure should return error JSON envelope",
        )
        ok("Analyze returns structured upstream failure when enabled but unavailable")
    else:
        fail(f"Analyze expected 503 (disabled), 200 (enabled), or 502 (upstream unavailable), got {status_code}")

    step("Rate limit triggers after 5 analyze requests per user")
    for i in range(5):
        status_code, body, headers = request_json_with_headers(
            "POST",
            "/analyze/",
            headers=other_headers,
            body={"profile_id": created_id, "policy_text": valid_policy},
        )
        assert_true(status_code in {404, 429}, f"Analyze pre-limit expected 404 or 429, got {status_code}")
        assert_true("X-RateLimit-Limit" in headers, "Rate limit header X-RateLimit-Limit missing")
        assert_true("X-RateLimit-Remaining" in headers, "Rate limit header X-RateLimit-Remaining missing")
        if status_code == 429:
            # If prior requests in this window already consumed budget, stop early.
            break

    status_code, rate_limited, headers = request_json_with_headers(
        "POST",
        "/analyze/",
        headers=other_headers,
        body={"profile_id": created_id, "policy_text": valid_policy},
    )
    assert_true(status_code == 429, f"Analyze rate-limit expected 429, got {status_code}")
    assert_true(
        isinstance(rate_limited, dict) and rate_limited.get("error", {}).get("code") == "RATE_LIMITED",
        "429 response should return RATE_LIMITED error code",
    )
    assert_true("Retry-After" in headers, "Retry-After header missing for 429")
    assert_true(headers.get("X-RateLimit-Limit") == "5", "X-RateLimit-Limit should be 5")
    assert_true(headers.get("X-RateLimit-Remaining") == "0", "X-RateLimit-Remaining should be 0 at limit")
    ok("Analyze rate limiting")

    step("Delete verify-user profile as verify-user")
    status_code, _ = request_json("DELETE", f"/profiles/{created_id}/", headers=verify_headers)
    assert_true(status_code == 204, f"DELETE /profiles/<id>/ expected 204, got {status_code}")
    ok("Delete profile")

    if analysis_id is not None:
        step("Delete analysis history as owner")
        status_code, _ = request_json("DELETE", f"/analyses/{analysis_id}/", headers=verify_headers)
        assert_true(status_code == 204, f"DELETE /analyses/<id>/ expected 204, got {status_code}")
        ok("Delete analysis history")

    print("\nVERIFICATION PASSED")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"\nVERIFICATION FAILED: {exc}")
        sys.exit(1)
