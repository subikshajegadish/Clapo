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

are forwarded to Django as:

- `/profiles/`
- `/analyze/`
- `/analyses/`

## Run

```bash
cd frontend
npm install
npm run dev
```
