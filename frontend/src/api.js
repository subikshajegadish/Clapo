export const API_BASE = import.meta.env.VITE_API_BASE || "/api";
export const DEMO_USER_ID = import.meta.env.VITE_DEMO_USER_ID || "demo-user";
export const GOOGLE_LOGIN_URL =
  import.meta.env.VITE_GOOGLE_LOGIN_URL || `${API_BASE}/auth/google/login/`;

function parseErrorBody(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function formatApiError(status, body) {
  const parsed = parseErrorBody(body);
  const apiError = parsed?.error;
  if (apiError && typeof apiError.message === "string" && apiError.message.trim()) {
    return apiError.message.trim();
  }
  const snippet = (body || "").replace(/\s+/g, " ").trim().slice(0, 180);
  if (status === 404 && (!snippet || snippet === "Not Found")) {
    return `Cannot reach API (${status}). Is the backend running, and is Vite's /api proxy configured? (${API_BASE})`;
  }
  return snippet || `${status} ${status === 404 ? "Not Found" : ""}`.trim();
}

const jsonHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "x-demo-user-id": DEMO_USER_ID,
};

/**
 * @returns {Promise<object[]>}
 */
export async function getProfiles() {
  const res = await fetch(`${API_BASE}/profiles/`, {
    headers: { Accept: "application/json", "x-demo-user-id": DEMO_USER_ID },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(formatApiError(res.status, text));
  }
  return res.json();
}

/**
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function createProfile(data) {
  const res = await fetch(`${API_BASE}/profiles/`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(formatApiError(res.status, text));
  }
  return res.json();
}

/**
 * @param {number} profile_id
 * @param {string} policy_text
 * @returns {Promise<object>}
 */
export async function analyzePolicy(profile_id, policy_text) {
  const res = await fetch(`${API_BASE}/analyze/`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ profile_id, policy_text }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(formatApiError(res.status, text));
  }
  return res.json();
}

/**
 * @returns {Promise<object[]>}
 */
export async function getAnalyses() {
  const res = await fetch(`${API_BASE}/analyses/`, {
    headers: { Accept: "application/json", "x-demo-user-id": DEMO_USER_ID },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(formatApiError(res.status, text));
  }
  return res.json();
}

/**
 * @param {number} id
 * @returns {Promise<object>}
 */
export async function getAnalysis(id) {
  const res = await fetch(`${API_BASE}/analyses/${id}/`, {
    headers: { Accept: "application/json", "x-demo-user-id": DEMO_USER_ID },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(formatApiError(res.status, text));
  }
  return res.json();
}

/**
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteAnalysis(id) {
  const res = await fetch(`${API_BASE}/analyses/${id}/`, {
    method: "DELETE",
    headers: { Accept: "application/json", "x-demo-user-id": DEMO_USER_ID },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(formatApiError(res.status, text));
  }
}

/**
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteProfile(id) {
  const res = await fetch(`${API_BASE}/profiles/${id}/`, {
    method: "DELETE",
    headers: { Accept: "application/json", "x-demo-user-id": DEMO_USER_ID },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(formatApiError(res.status, text));
  }
}

/**
 * @returns {Promise<{authenticated: boolean; user: {id?: string; email?: string; username?: string} | null}>}
 */
export async function getCurrentUser() {
  const res = await fetch(`${API_BASE}/auth/me/`, {
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(formatApiError(res.status, text));
  }
  const data = await res.json();
  return {
    authenticated: Boolean(data?.authenticated),
    user: data?.user && typeof data.user === "object" ? data.user : null,
  };
}

/**
 * Returns backend Google OAuth start URL.
 * TODO: Confirm exact provider start route once backend social login flow is finalized.
 */
export function getGoogleLoginUrl() {
  return GOOGLE_LOGIN_URL;
}

/**
 * @returns {Promise<void>}
 */
export async function logout() {
  const res = await fetch(`${API_BASE}/auth/logout/`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(formatApiError(res.status, text));
  }
}
