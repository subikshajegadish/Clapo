export const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function formatApiError(status, body) {
  const snippet = (body || "").replace(/\s+/g, " ").trim().slice(0, 180);
  if (status === 404 && (!snippet || snippet === "Not Found")) {
    return `Cannot reach API (${status}). Is the backend running, and is Vite's /api proxy configured? (${API_BASE})`;
  }
  return snippet || `${status} ${status === 404 ? "Not Found" : ""}`.trim();
}

const jsonHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

/**
 * @returns {Promise<object[]>}
 */
export async function getProfiles() {
  const res = await fetch(`${API_BASE}/profiles`, {
    headers: { Accept: "application/json" },
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
  const res = await fetch(`${API_BASE}/profiles`, {
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
  const res = await fetch(`${API_BASE}/analyze`, {
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
