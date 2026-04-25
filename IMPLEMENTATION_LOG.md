# Clapo — Implementation log

Chronological record of what was built and changed. Append new entries at the bottom for each session or meaningful change.

---

## 2026-04-24 — Initial full-stack scaffold

**Goal:** Monorepo `clapo/` with `backend/` (Node + Express + SQLite) and `frontend/` (Vite + React, JavaScript).

### Backend (`backend/`)

- Initialized npm package (`package.json`, `"type": "module"`).
- Dependencies: `express`, `cors`, `dotenv`, `better-sqlite3`, `axios`.
- **`index.js`:** Express server, CORS, JSON body parser, `GET /` → plain text `"Backend running"`.
- **`db.js`:** `better-sqlite3` database file `clapo.db`; `CREATE TABLE IF NOT EXISTS profiles` with columns:  
  `id` (PK autoincrement), `name`, `age`, `state`, `employment_status`, `citizenship`, `housing`, `has_dependents`, `dependents_count`, `university`, `degree_level`, `financial_aid`, `industry`, `employment_type`, `income_bracket`, `business_type`, `num_employees`, `created_at` (default current timestamp).
- **`.env`:** `CLAUDE_API_KEY=your_api_key_here` (placeholder for future use).
- **Scripts:** `npm start` → `node index.js`; `npm run dev` → `node --watch index.js`.
- **Tooling:** Repo root `.tool-versions` set to `nodejs 22.13.0` for asdf compatibility where applicable.

### Frontend (`frontend/`)

- Created with **Vite**, template **React (JavaScript)** — `.jsx` entrypoints, no TypeScript.
- Default dev server port **5173** (Vite default).

### Run commands (documented at setup)

- Backend: `cd backend && npm start`
- Frontend: `cd frontend && npm run dev`

---

## 2026-04-24 — Profile REST API

**Goal:** CRUD-style profile persistence via SQLite; keep handlers in `index.js`.

### Changes (`backend/index.js`)

- Switched from side-effect `import "./db.js"` to **`import db from "./db.js"`** and use `db` for queries.
- **`POST /profiles`:** Accepts JSON with all writable profile fields; `db.prepare(...).run(...)` insert; responds with full row including `id` and `created_at` via `SELECT *` by `lastInsertRowid`.
- **`GET /profiles`:** `db.prepare("SELECT * FROM profiles").all()`; returns JSON array.
- **Logging:** `console.log` on create (e.g. `Profile creation` with `name`, `state`) and on list (`Fetch profiles request`).
- Intentionally minimal: no validation layer, no auth, no elaborate error handling.

### Manual testing

- Documented example `curl` and Postman flows for `POST /profiles` and `GET /profiles`.

---

## 2026-04-24 — Local run / port behavior

**Observation:** On macOS, port **5000** is often bound by **AirPlay Receiver**, so HTTP requests to `localhost:5000` may hit AirTunes (e.g. HTTP 403) instead of Express.

### Change (`backend/index.js`) — updated default

- **`PORT` from environment:** default is now **5050**; set `PORT=5000` (or any port) if you prefer. **`frontend/.env.development`** and **`vite.config.js`** proxy default match **5050**.

### Dev servers started (session)

- Frontend: `npm run dev` → **http://localhost:5173/**
- Backend: **`npm start`** → **http://localhost:5050/** by default (or `PORT` override).

---

## 2026-04-24 — Implementation log (this file)

**Goal:** Single living document of implementation decisions and edits.

- Added **`IMPLEMENTATION_LOG.md`** at repository root.
- **Process:** After meaningful changes to Clapo, append a dated section here (what/why/files touched). Keeps history for onboarding and reviews without digging through chat.

---

## 2026-04-24 — POST /analyze (Claude policy analysis)

**Goal:** Analyze `policy_text` for a stored profile via Anthropic Claude; return strict JSON to the client; no DB persistence.

### Changes (`backend/index.js`)

- **`axios`** import; constants `CLAUDE_MODEL` (`claude-sonnet-4-20250514`) and Anthropic Messages URL.
- **Helpers:**
  - `isLikelyUSCitizen` / `computeAnalyzeFlags(profile)` — drives prompt rules (student, non‑US citizen, housing present, employment status present, self‑employed / business signals).
  - `buildAnalyzePrompt(profile, policy_text, flags)` — profile JSON + policy + plain‑English + strict JSON schema and section inclusion list.
  - `parseClaudeJson(text)` — strips optional ```json fences, slices first `{`…last `}`, `JSON.parse`.
  - `callClaudeOnce` / `callClaudeWithRetry` — POST to `v1/messages` with `x-api-key` from `process.env.CLAUDE_API_KEY`, `anthropic-version: 2023-06-01`; **one retry** (two attempts total) on failure; 120s timeout.
- **`POST /analyze`:** Body `{ profile_id, policy_text }`; loads profile with existing `selectById`; **404** if missing; **400** if body invalid; **502** on Claude/parse failure. Response body is the parsed Claude JSON (not stored). Logs **`Analysis start`** / **`Analysis end`** with `profile_id` and outcome.

### Env

- Requires **`CLAUDE_API_KEY`** (see `backend/.env`).

### Follow-up — load `backend/.env` reliably

- **`dotenv.config({ path: path.join(__dirname, ".env") })`** in `index.js` so `CLAUDE_API_KEY` loads from **`backend/.env`** even when Node’s cwd is the repo root.
- Removed placeholder-only rejection; any non-empty trimmed key is used.

---

## 2026-04-24 — Frontend env + dev proxy

**Goal:** Clear Vite env loading and a stable way to call the backend from the browser in dev.

### Changes

- **`frontend/vite.config.js`:** `loadEnv` from the `frontend/` directory; dev **`server.proxy`**: `/api` → `VITE_API_PROXY_TARGET` (default `http://127.0.0.1:5000`), strip `/api` prefix so `/api/profiles` hits Express `/profiles`.
- **`frontend/.env.development`:** `VITE_API_PROXY_TARGET`, `VITE_API_BASE=/api` (loaded in `npm run dev`; avoids relying on a lone `.env` at the wrong path).
- **`frontend/.env.example`:** Documents the same variables; copy to **`.env.local`** for machine-only overrides (matches the “multiple files” pattern; `*.local` stays gitignored in `frontend/.gitignore`).
- **`frontend/src/api.js`:** exports **`API_BASE`** from `import.meta.env.VITE_API_BASE` for `fetch(\`${API_BASE}/profiles\`)` etc.

---

## 2026-04-24 — `POST /analyze` (spec check)

- Endpoint was already present; confirmed it matches: body `profile_id` + `policy_text`, SQLite lookup + 404, Claude `claude-sonnet-4-20250514` via axios + `CLAUDE_API_KEY`, prompt + section flags, strict JSON parse, no DB write, one retry, start/end logs.
- **`index.js`:** consolidated `import` block before `dotenv.config()` for valid module layout.

---

## 2026-04-24 — `USE_LLM_ANALYZER` in backend `.env`

- **`USE_LLM_ANALYZER`** in `backend/.env`: when `false`, `0`, `no`, or `off` (case-insensitive), **`POST /analyze`** returns **503** with a short hint and does not call Claude. When unset, defaults to **enabled** (same as `true`).
- **`backend/.env.example`** documents `CLAUDE_API_KEY` and `USE_LLM_ANALYZER`.

---

## 2026-04-24 — Default backend port **5050** (macOS / AirPlay)

- **`backend/index.js`:** default `PORT` is **5050** (still overridable with `PORT=...`). Avoids conflict with AirPlay on **5000**.
- **`frontend/vite.config.js`** and **`frontend/.env.development`** / **`.env.example`:** proxy default **`http://127.0.0.1:5050`** so `npm run dev` matches `npm start` with no extra env.

---

## 2026-04-24 — `POST /analyze` test run + logging + model fallback + `parseClaudeJson`

- **`/analyze` restored** when missing from `index.js`; **GET /profiles** then **POST /analyze** exercised with `profile_id: 1` and the given `policy_text`.
- **Logging:** `[analyze] Full request sent to Claude` (Anthropic body), **`[analyze] Claude API error response`** on failures (full JSON), **`[analyze] Raw Claude API response`** (full message JSON), **`[analyze] Raw assistant text`**, **`[analyze] Parsed JSON returned to client`**.
- **Anthropic:** Dated model **`claude-sonnet-4-20250514`** returned **404 `not_found_error`** for this key; **retry** uses **`CLAUDE_MODEL_FALLBACK`** (default **`claude-sonnet-4-5`**, resolves e.g. to `claude-sonnet-4-5-20250929`). Override with **`CLAUDE_MODEL`** / **`CLAUDE_MODEL_FALLBACK`** in `backend/.env`. Generic failures still retry once with the same model unless the first failure was model 404 (then second uses fallback).
- **`parseClaudeJson`:** Markdown fence stripping via a single non-anchored ``` block match; then **`JSON.parse`**, then **`extractBalancedJsonObject`** (strings/escapes), then first-`{`–last-`}` slice; on failure logs full raw text between `---BEGIN---` / `---END---`.
- **`backend/.env.example`:** documents optional `CLAUDE_MODEL` / `CLAUDE_MODEL_FALLBACK`.

---

## 2026-04-24 — Backend verification gate (pre–frontend integration)

- **`validateAnalyzePayload`** in `index.js`: after parsing Claude output, ensures top-level **`policy_title`**, **`summary`**, **`overall_impact`**, **`sections`** (array); otherwise throws → **502** with message.
- Log label **`[analyze] Final JSON returned to client (/analyze):`** for the payload sent in **`res.json`**.
- **`backend/scripts/verify-backend.mjs`:** runs **GET /profiles** (array check), **POST /profiles** (sample body), **POST /analyze** (simple `policy_text`), asserts response shape. **`npm run verify`** with **`BASE=http://127.0.0.1:3001`** while server is up.

---

## 2026-04-24 — Frontend `src/api.js`

- **`API_BASE`:** `import.meta.env.VITE_API_BASE || "/api"`.
- **`getProfiles`:** `GET ${API_BASE}/profiles` with `Accept: application/json`.
- **`createProfile(data)`:** `POST ${API_BASE}/profiles` with JSON headers + `JSON.stringify(data)`.
- **`analyzePolicy(profile_id, policy_text)`:** `POST ${API_BASE}/analyze` with JSON body `{ profile_id, policy_text }`.

---

## 2026-04-24 — Profile selection UI

- **`src/ProfileList.jsx`:** loads **`getProfiles()`** on mount; state for list, **`selectedProfile`**, loading, error; cards show **name** + **employment_status**; **Create New Profile** button calls optional **`onCreateNew`**; selected profile shown in a highlighted **Selected** strip (name, status, state, id).
- **`src/ProfileList.css`:** layout and card / selection styles using existing CSS variables.
- **`src/App.jsx`:** renders **`ProfileList`** as main view (placeholder **`onCreateNew`** for a future create flow).

---

## 2026-04-24 — Create profile form

- **`src/CreateProfile.jsx`:** name, age, state, employment **dropdown**; conditional **university** (student), **industry** (employed), **business_type** (self-employed); submit calls **`createProfile()`** with other DB fields `null`; **`onSuccess`** / **`onCancel`** props.
- **`src/CreateProfile.css`:** compact form layout.
- **`ProfileList.jsx`:** **`refreshProfiles`** after successful create; toggle form with **Create New Profile** / **Hide form**.

---

## 2026-04-24 — Results UI

- **`src/Results.jsx`:** Renders **`policy_title`**, **`summary`**, **`overall_impact`** (pill with level tint); maps **`sections`** to cards (emoji + title, impact badge, explanation, action block).
- **`src/Results.css`:** Spacing, typography, section cards, High/Medium/Low hints for overall + per-section badges (light + dark).

---

## 2026-04-24 — Fix "Not Found" on create profile (Vite proxy)

- **Cause:** `vite.config.js` had **no `/api` proxy**, so `fetch('/api/profiles')` hit the **Vite dev server**, which answered **404** with body **`Not Found`**. `api.js` surfaced that text as the thrown `Error.message`.
- **Fix:** Restored **`server.proxy`** `/api` → `VITE_API_PROXY_TARGET` (default **`http://127.0.0.1:3001`** to match backend `PORT` default), with **`rewrite`** stripping `/api`.
- **`frontend/.env.development`** / **`.env.example`:** proxy target set to **3001** (align with backend).
- **`api.js`:** **`formatApiError`** gives a clearer message for generic 404 + "Not Found".

---

## 2026-04-24 — `Analyze.jsx` (policy file → text → API)

- **`src/Analyze.jsx`:** `<input type="file" accept=".pdf,.docx,.txt" />`; **TXT** via `FileReader.readAsText`; **PDF** via **`pdfjs-dist`** (worker from `pdf.worker.min.mjs?url`, all pages text); **DOCX** via **`mammoth.extractRawText`**; state **`policyText`** + ~200 char **preview**; **Analyze Policy** calls **`analyzePolicy(profileId, policyText)`**; **`extracting`** / **`analyzing`** disable controls; shows **`Results`** on success.
- **Deps:** `pdfjs-dist`, `mammoth` in `frontend/package.json`.
- **`ProfileList.jsx`:** renders **`<Analyze profileId={…} key={…} />`** when a profile is selected.

---

## 2026-04-24 — `npm start` from repo root + listen errors

- **Root `package.json`:** `npm start` runs **`npm run start --prefix backend`** so starting from **`Clapo/`** (not only `backend/`) works. Also **`start:backend`**, **`dev:backend`**, **`dev:frontend`**.
- **`backend/index.js`:** **`server.on('error')`** — clear message for **`EADDRINUSE`** with hint to use another **`PORT`**.

---

## 2026-04-24 — PDF extract empty (“No text…”) + paste fallback

- **Cause:** Many PDFs (e.g. scans) have **no text layer**—`pdf.js` only reads embedded text, so extraction can be empty. Some digital PDFs also need **standard font data** for correct glyph mapping.
- **`extractPdfText`:** `getDocument` uses **`useSystemFonts: true`** only (no CDN font URL—avoids **`net::ERR_FAILED`** from blocked third-party fetches); page text joins **`str`** with **`hasEOL`** newlines.
- **UI:** **Policy text** **`<textarea>`** always visible—upload fills it, or user can **paste** when a PDF has no text; clearer empty-file message; character count.

---

## 2026-04-24 — Mammoth / `.docx` extraction (Vite)

- **`src/docxText.js`:** **`extractTextFromDocx(arrayBuffer)`** uses **`import('mammoth')`** then **`(mod.default ?? mod).extractRawText({ arrayBuffer })`** so default vs namespace export both work; dev-only log of mammoth **messages**; throws if the API is missing.
- **`Analyze.jsx`:** DOCX path calls **`extractTextFromDocx`** (no static `import 'mammoth'`).
- **`vite.config.js`:** **`optimizeDeps.include`** for **`mammoth`**, **`jszip`**, **`@xmldom/xmldom`**, **`bluebird`**; **`build.commonjsOptions.transformMixedEsModules`**; **`define.global`** → **`globalThis`** for older CJS deps in the browser graph.

---

*Last updated: 2026-04-24*
