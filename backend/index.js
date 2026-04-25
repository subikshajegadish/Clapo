import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import axios from "axios";
import db from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

/** Prefer dated ID from product spec; many keys resolve `claude-sonnet-4-5` instead (see retry below). */
const CLAUDE_MODEL =
  process.env.CLAUDE_MODEL?.trim() || "claude-sonnet-4-20250514";
const CLAUDE_MODEL_FALLBACK =
  process.env.CLAUDE_MODEL_FALLBACK?.trim() || "claude-sonnet-4-5";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend running");
});

const insertProfile = db.prepare(`
  INSERT INTO profiles (
    name, age, state, employment_status,
    citizenship, housing, has_dependents,
    dependents_count, university, degree_level,
    financial_aid, industry, employment_type,
    income_bracket, business_type, num_employees
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const selectById = db.prepare("SELECT * FROM profiles WHERE id = ?");
const selectAll = db.prepare("SELECT * FROM profiles");

function isLikelyUSCitizen(citizenship) {
  const s = String(citizenship ?? "").trim().toLowerCase();
  if (!s) return null;
  return /\b(us|usa|u\.s\.|u\.s\.a\.|american|united states|us citizen)\b/.test(s);
}

function computeAnalyzeFlags(profile) {
  const uni = String(profile.university ?? "").trim();
  const deg = String(profile.degree_level ?? "").trim();
  const empStatus = String(profile.employment_status ?? "");
  const isStudent =
    uni.length > 0 ||
    /student/i.test(empStatus) ||
    /bachelor|master|phd|associate|undergrad|doctoral|mba|jd|md/i.test(deg);

  const us = isLikelyUSCitizen(profile.citizenship);
  const includeImmigration = us === false;

  const includeHousing = String(profile.housing ?? "").trim().length > 0;
  const includeEmployment = String(profile.employment_status ?? "").trim().length > 0;

  const et = `${profile.employment_type ?? ""} ${empStatus} ${profile.business_type ?? ""}`;
  const includeBusiness =
    /self[\s-]?employ|freelance|contractor|sole proprietor|business owner|entrepreneur|1099|gig/i.test(
      et
    ) || String(profile.business_type ?? "").trim().length > 0;

  return {
    isStudent,
    includeImmigration,
    includeHousing,
    includeEmployment,
    includeBusiness,
  };
}

function buildAnalyzePrompt(profile, policy_text, flags) {
  return `You are helping one person understand how a policy might affect them.

User profile (JSON):
${JSON.stringify(profile, null, 2)}

Policy text:
---
${policy_text}
---

Your job:
- Analyze this policy specifically for this user using their profile.
- Use simple plain English. No legal jargon.
- Generate ONLY sections that are relevant to this user (see rules below).

Output rules (STRICT):
- Return ONLY one JSON object. No markdown code fences. No explanation before or after the JSON.

JSON shape (all keys required at top level):
{
  "policy_title": string,
  "summary": string,
  "overall_impact": must be exactly one of: "High", "Medium", "Low",
  "sections": [ ... ]
}

Each item in "sections" must have exactly these keys:
"title" (string), "impact_level" ("High"|"Medium"|"Low"), "emoji" (string), "explanation" (string), "action" (string).

Section inclusion rules (obey exactly):
1) ALWAYS include exactly one Financial Impact section with title "💰 Financial Impact" and emoji "💰".
2) Education: ${flags.isStudent ? "INCLUDE one Education-related section for this student (use a clear title with a fitting emoji, and set the same emoji in the emoji field)." : "Do NOT include any Education section."}
3) Immigration: ${flags.includeImmigration ? "INCLUDE one Immigration-related section (user is not indicated as a US citizen in the profile)." : "Do NOT include any Immigration section."}
4) Housing: ${flags.includeHousing ? "INCLUDE one Housing section tailored to whether they rent or own / homeowner situation from the profile." : "Do NOT include any Housing section."}
5) Employment: ${flags.includeEmployment ? "INCLUDE one Employment section reflecting whether they are employed, unemployed, or similar status from the profile." : "Do NOT include any Employment section."}
6) Business: ${flags.includeBusiness ? "INCLUDE one Business / self-employment section if they appear self-employed or run a business." : "Do NOT include any Business section."}

Order sections in a sensible priority: Financial first, then any others that apply.`;
}

/** Extract a single top-level JSON object by brace depth (handles strings/escapes). */
function extractBalancedJsonObject(text) {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

function validateAnalyzePayload(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Analyze response must be a JSON object");
  }
  for (const key of ["policy_title", "summary", "overall_impact", "sections"]) {
    if (!(key in data)) {
      throw new Error(`Missing required field: ${key}`);
    }
  }
  if (typeof data.policy_title !== "string") {
    throw new Error("policy_title must be a string");
  }
  if (typeof data.summary !== "string") {
    throw new Error("summary must be a string");
  }
  if (typeof data.overall_impact !== "string") {
    throw new Error("overall_impact must be a string");
  }
  if (!Array.isArray(data.sections)) {
    throw new Error("sections must be an array");
  }
}

function parseClaudeJson(text, logRawOnError = true) {
  let raw = String(text ?? "").trim();
  const original = raw;

  const fenceLoose = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceLoose) raw = fenceLoose[1].trim();

  const attempts = [
    () => JSON.parse(raw),
    () => {
      const slice = extractBalancedJsonObject(raw);
      if (!slice) throw new Error("No balanced {…} object found");
      return JSON.parse(slice);
    },
    () => {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start === -1 || end <= start) throw new Error("No JSON object bounds");
      return JSON.parse(raw.slice(start, end + 1));
    },
  ];

  let lastErr;
  for (const tryParse of attempts) {
    try {
      return tryParse();
    } catch (e) {
      lastErr = e;
    }
  }

  if (logRawOnError) {
    console.error("[analyze] parseClaudeJson FAILED. Raw assistant text:\n---BEGIN---\n");
    console.error(original);
    console.error("\n---END---\n");
  }
  throw new Error(
    `JSON parse failed: ${lastErr?.message || lastErr}. First 500 chars: ${original.slice(0, 500)}`
  );
}

function normalizedClaudeApiKey() {
  return String(process.env.CLAUDE_API_KEY ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/^["']+|["']+$/g, "")
    .trim();
}

function messageFromAnthropicAxiosError(e) {
  if (!axios.isAxiosError(e)) return e?.message || String(e);
  const status = e.response?.status;
  const errObj = e.response?.data?.error;
  const msg = errObj?.message || e.message;

  if (status === 401 || /invalid authentication|authentication credentials/i.test(String(msg))) {
    return (
      "Anthropic API key rejected (401). In backend/.env set CLAUDE_API_KEY to a valid key from " +
      "https://console.anthropic.com/settings/keys — single line, no quotes or spaces around the value. " +
      "Save the file and restart the backend (npm start)."
    );
  }
  if (status === 403) {
    return `${msg} (403 — check billing and model access in Anthropic Console.)`;
  }
  return msg;
}

async function callClaudeOnce(anthropicBody) {
  const apiKey = normalizedClaudeApiKey();
  if (!apiKey) {
    throw new Error("CLAUDE_API_KEY is missing (expected in backend/.env)");
  }
  const { data } = await axios.post(ANTHROPIC_URL, anthropicBody, {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    timeout: 120000,
  });
  return data;
}

function isAnthropicModelNotFound(e) {
  if (!axios.isAxiosError(e) || e.response?.status !== 404) return false;
  const m = String(e.response?.data?.error?.message ?? "").toLowerCase();
  return m.includes("model");
}

async function callClaudeWithRetry(anthropicBody) {
  const preferred = anthropicBody.model;
  const fallback = CLAUDE_MODEL_FALLBACK;
  let lastErr;
  let lastWasModel404 = false;

  for (let attempt = 0; attempt < 2; attempt++) {
    const model =
      attempt === 1 && lastWasModel404 && preferred !== fallback
        ? fallback
        : preferred;
    const body = { ...anthropicBody, model };
    try {
      return await callClaudeOnce(body);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.data) {
        console.error(
          "[analyze] Claude API error response:",
          JSON.stringify(e.response.data, null, 2)
        );
      }
      const msg = messageFromAnthropicAxiosError(e);
      lastWasModel404 = isAnthropicModelNotFound(e);
      lastErr = new Error(msg);
      console.warn(
        `[analyze] Claude attempt ${attempt + 1} failed (model=${model}):`,
        msg
      );
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        break;
      }
      if (attempt === 1) break;
    }
  }
  throw lastErr;
}

app.post("/profiles", (req, res) => {
  const {
    name,
    age,
    state,
    employment_status,
    citizenship,
    housing,
    has_dependents,
    dependents_count,
    university,
    degree_level,
    financial_aid,
    industry,
    employment_type,
    income_bracket,
    business_type,
    num_employees,
  } = req.body;

  console.log("Profile creation", { name, state });

  const result = insertProfile.run(
    name,
    age,
    state,
    employment_status,
    citizenship,
    housing,
    has_dependents,
    dependents_count,
    university,
    degree_level,
    financial_aid,
    industry,
    employment_type,
    income_bracket,
    business_type,
    num_employees
  );

  const created = selectById.get(result.lastInsertRowid);
  res.json(created);
});

app.get("/profiles", (req, res) => {
  console.log("Fetch profiles request");
  const profiles = selectAll.all();
  res.json(profiles);
});

app.post("/analyze", async (req, res) => {
  const { profile_id, policy_text } = req.body ?? {};
  console.log("[analyze] Analysis start", { profile_id });

  if (profile_id == null || typeof policy_text !== "string") {
    console.log("[analyze] Analysis end", { profile_id, ok: false, reason: "invalid_body" });
    return res.status(400).json({
      error: "Invalid body: require profile_id (number) and policy_text (string)",
    });
  }

  const profile = selectById.get(profile_id);
  if (!profile) {
    console.log("[analyze] Analysis end", { profile_id, ok: false, reason: "profile_not_found" });
    return res.status(404).json({ error: "Profile not found" });
  }

  const flags = computeAnalyzeFlags(profile);
  const userPrompt = buildAnalyzePrompt(profile, policy_text, flags);

  const anthropicBody = {
    model: CLAUDE_MODEL.trim(),
    max_tokens: 8192,
    messages: [{ role: "user", content: userPrompt }],
  };

  console.log(
    "[analyze] Full request sent to Claude (Anthropic messages body):\n",
    JSON.stringify(anthropicBody, null, 2)
  );

  try {
    const claudeResponse = await callClaudeWithRetry(anthropicBody);

    console.log(
      "[analyze] Raw Claude API response (full JSON from Anthropic):\n",
      JSON.stringify(claudeResponse, null, 2)
    );

    const block = claudeResponse.content?.find((b) => b.type === "text");
    const rawText = block?.text;
    if (typeof rawText !== "string") {
      console.error("[analyze] No text block in Claude content:", claudeResponse.content);
      throw new Error("No text content in Claude response");
    }

    console.log("[analyze] Raw assistant text from Claude:\n---BEGIN TEXT---\n", rawText, "\n---END TEXT---\n");

    const parsed = parseClaudeJson(rawText);
    validateAnalyzePayload(parsed);

    console.log(
      "[analyze] Final JSON returned to client (/analyze):\n",
      JSON.stringify(parsed, null, 2)
    );
    console.log("[analyze] Analysis end", { profile_id, ok: true });

    return res.json(parsed);
  } catch (e) {
    const detail = e?.message || String(e);
    console.log("[analyze] Analysis end", { profile_id, ok: false, error: detail });
    return res.status(502).json({ error: "Analysis failed", detail });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the other process or run:\n  PORT=3002 npm start`
    );
  } else {
    console.error("Server failed to start:", err);
  }
  process.exit(1);
});
