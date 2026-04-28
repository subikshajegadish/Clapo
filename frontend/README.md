# Clapo Frontend

## Local development

- Django backend: `http://127.0.0.1:8000`
- Frontend (Vite): `http://127.0.0.1:5173`

The Vite dev server proxies `/api/*` to the Django backend.
Proxy config lives in `vite.config.js` and defaults to:

```env
VITE_API_PROXY_TARGET=http://127.0.0.1:8000
VITE_API_BASE=/api
```

So these browser calls:

- `/api/profiles/`
- `/api/analyze/`
- `/api/analyses/`
- `/api/auth/me/`

are forwarded to Django as:

- `/profiles/`
- `/analyze/`
- `/analyses/`
- `/auth/me/`

By default, the app runs in demo mode using `x-demo-user-id`.
If the browser has an authenticated backend session, the frontend auth status
chip will display signed-in user info.
Google login requires backend OAuth credentials/configuration. Without that,
the app remains fully usable in demo mode.

## Run

```bash
cd frontend
npm install
npm run dev
```
