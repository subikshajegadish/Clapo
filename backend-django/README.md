# backend-django

Clapo Django backend (DRF + CORS + dotenv + SQLite dev DB).

## Auth foundation (OAuth-ready)

This backend now includes OAuth foundation wiring via `django-allauth` + `dj-rest-auth`.
Google OAuth credentials are optional at this stage and **not required** for local demo mode.
Current local development can continue using `x-demo-user-id` fallback ownership.

## Setup

```bash
cd backend-django
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Set analyzer mode in `.env`:
- `USE_LLM_ANALYZER=false` to force `/analyze/` to return 503
- `USE_LLM_ANALYZER=true` with `ANTHROPIC_API_KEY` to enable Anthropic calls
- `ANTHROPIC_MODEL=claude-sonnet-4-5` for primary model
- `ANTHROPIC_MODEL_FALLBACK=` optional fallback model when primary model is not found
- `ANTHROPIC_TIMEOUT_SECONDS=120` request timeout for Anthropic calls
- `GOOGLE_CLIENT_ID=` optional for future Google OAuth login flow
- `GOOGLE_CLIENT_SECRET=` optional for future Google OAuth login flow
- `FRONTEND_URL=http://localhost:5173` frontend origin used by auth setup

## Migrate (SQLite dev DB)

```bash
python manage.py migrate
```

OAuth foundation adds Django auth/site tables via migrations. Run migrate after pulling backend updates.

## Run server

```bash
python manage.py runserver 8000
```

## Verify backend flows

With server running:

```bash
python scripts/verify_backend.py
```

Or with explicit base URL:

```bash
BASE=http://127.0.0.1:8000 python scripts/verify_backend.py
```

## Example curl requests

Health:

```bash
curl http://127.0.0.1:8000/health/
```

Auth foundation status:

```bash
curl http://127.0.0.1:8000/auth/me/
```

Create profile:

```bash
curl -X POST "http://127.0.0.1:8000/profiles/" \
  -H "Content-Type: application/json" \
  -H "x-demo-user-id: demo-user" \
  -d '{
    "name": "Alex",
    "age": 30,
    "state": "MD",
    "employment_status": "employed"
  }'
```

List profiles for current demo user:

```bash
curl "http://127.0.0.1:8000/profiles/" \
  -H "x-demo-user-id: demo-user"
```

Get one profile:

```bash
curl "http://127.0.0.1:8000/profiles/1/" \
  -H "x-demo-user-id: demo-user"
```

Delete one profile:

```bash
curl -X DELETE "http://127.0.0.1:8000/profiles/1/" \
  -H "x-demo-user-id: demo-user"
```

Analyze policy:

```bash
curl -X POST "http://127.0.0.1:8000/analyze/" \
  -H "Content-Type: application/json" \
  -H "x-demo-user-id: demo-user" \
  -d '{
    "profile_id": 1,
    "policy_text": "Starting next year, low-income renters may receive a monthly tax credit and students may qualify for tuition grants under new eligibility rules..."
  }'
```

Note: repeated analyze requests with the same user, same profile, and same policy text may reuse a recent stored result and return `"cached": true`.

List analysis history:

```bash
curl "http://127.0.0.1:8000/analyses/" \
  -H "x-demo-user-id: demo-user"
```

Get one analysis result:

```bash
curl "http://127.0.0.1:8000/analyses/1/" \
  -H "x-demo-user-id: demo-user"
```

Delete one analysis result:

```bash
curl -X DELETE "http://127.0.0.1:8000/analyses/1/" \
  -H "x-demo-user-id: demo-user"
```
