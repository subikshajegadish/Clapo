const PROFILE_ALLOWED_FIELDS = [
  "name",
  "age",
  "state",
  "employment_status",
  "citizenship",
  "housing",
  "has_dependents",
  "dependents_count",
  "university",
  "degree_level",
  "financial_aid",
  "industry",
  "employment_type",
  "income_bracket",
  "business_type",
  "num_employees",
];

const ANALYZE_ALLOWED_FIELDS = ["profile_id", "policy_text"];

const EMPLOYMENT_STATUS_VALUES = new Set([
  "student",
  "employed",
  "unemployed",
  "self-employed",
  "retired",
  "other",
]);

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function normalizeOptionalString(value) {
  if (value == null) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function addUnknownFieldErrors(input, allowedFields, details) {
  const allowed = new Set(allowedFields);
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      details.push({ field: key, message: "Unknown field" });
    }
  }
}

function validateOptionalStringField(input, key, maxLen, details) {
  const raw = input[key];
  const normalized = normalizeOptionalString(raw);
  if (normalized == null) return null;
  if (typeof normalized !== "string") {
    details.push({ field: key, message: "Must be a string or null" });
    return null;
  }
  if (normalized.length > maxLen) {
    details.push({ field: key, message: `Must be at most ${maxLen} characters` });
    return null;
  }
  return normalized;
}

function validateIntegerField(input, key, min, max, details, required = false) {
  const raw = input[key];
  if (raw == null) {
    if (required) details.push({ field: key, message: "Field is required" });
    return null;
  }
  if (!Number.isInteger(raw)) {
    details.push({ field: key, message: "Must be an integer" });
    return null;
  }
  if (raw < min || raw > max) {
    details.push({ field: key, message: `Must be between ${min} and ${max}` });
    return null;
  }
  return raw;
}

function validationError(details) {
  return {
    code: "VALIDATION_ERROR",
    message: "Invalid request body",
    details,
  };
}

export function buildError(code, message, details = []) {
  return { error: { code, message, details } };
}

export function sendError(res, status, code, message, details = []) {
  return res.status(status).json(buildError(code, message, details));
}

export function validateProfilePayload(input) {
  const details = [];
  if (!isPlainObject(input)) {
    return { ok: false, error: validationError([{ field: "body", message: "Must be a JSON object" }]) };
  }

  addUnknownFieldErrors(input, PROFILE_ALLOWED_FIELDS, details);

  const nameRaw = normalizeOptionalString(input.name);
  if (nameRaw == null) {
    details.push({ field: "name", message: "Field is required" });
  } else if (typeof nameRaw !== "string") {
    details.push({ field: "name", message: "Must be a string" });
  } else if (nameRaw.length < 1 || nameRaw.length > 80) {
    details.push({ field: "name", message: "Must be between 1 and 80 characters" });
  }

  const employmentStatusRaw = normalizeOptionalString(input.employment_status);
  if (employmentStatusRaw == null) {
    details.push({ field: "employment_status", message: "Field is required" });
  } else if (typeof employmentStatusRaw !== "string") {
    details.push({ field: "employment_status", message: "Must be a string" });
  } else if (!EMPLOYMENT_STATUS_VALUES.has(employmentStatusRaw)) {
    details.push({
      field: "employment_status",
      message: "Must be one of: student, employed, unemployed, self-employed, retired, other",
    });
  }

  const age = validateIntegerField(input, "age", 0, 120, details, false);
  const dependents_count = validateIntegerField(input, "dependents_count", 0, 20, details, false);
  const num_employees = validateIntegerField(input, "num_employees", 0, 100000, details, false);

  const hasDependentsRaw = input.has_dependents;
  let has_dependents = null;
  if (hasDependentsRaw != null) {
    if (typeof hasDependentsRaw !== "boolean") {
      details.push({ field: "has_dependents", message: "Must be a boolean or null" });
    } else {
      has_dependents = hasDependentsRaw;
    }
  }

  const output = {
    name: typeof nameRaw === "string" ? nameRaw : null,
    age,
    state: validateOptionalStringField(input, "state", 50, details),
    employment_status: typeof employmentStatusRaw === "string" ? employmentStatusRaw : null,
    citizenship: validateOptionalStringField(input, "citizenship", 120, details),
    housing: validateOptionalStringField(input, "housing", 120, details),
    has_dependents,
    dependents_count,
    university: validateOptionalStringField(input, "university", 120, details),
    degree_level: validateOptionalStringField(input, "degree_level", 120, details),
    financial_aid: validateOptionalStringField(input, "financial_aid", 120, details),
    industry: validateOptionalStringField(input, "industry", 120, details),
    employment_type: validateOptionalStringField(input, "employment_type", 120, details),
    income_bracket: validateOptionalStringField(input, "income_bracket", 120, details),
    business_type: validateOptionalStringField(input, "business_type", 120, details),
    num_employees,
  };

  if (details.length > 0) {
    return { ok: false, error: validationError(details) };
  }
  return { ok: true, value: output };
}

export function validateAnalyzePayload(input) {
  const details = [];
  if (!isPlainObject(input)) {
    return { ok: false, error: validationError([{ field: "body", message: "Must be a JSON object" }]) };
  }

  addUnknownFieldErrors(input, ANALYZE_ALLOWED_FIELDS, details);

  const profile_id = validateIntegerField(input, "profile_id", 1, Number.MAX_SAFE_INTEGER, details, true);

  const policyTextRaw = normalizeOptionalString(input.policy_text);
  let policy_text = null;
  if (policyTextRaw == null) {
    details.push({ field: "policy_text", message: "Field is required" });
  } else if (typeof policyTextRaw !== "string") {
    details.push({ field: "policy_text", message: "Must be a string" });
  } else if (policyTextRaw.length < 50 || policyTextRaw.length > 120000) {
    details.push({ field: "policy_text", message: "Must be between 50 and 120000 characters" });
  } else {
    policy_text = policyTextRaw;
  }

  if (details.length > 0) {
    return { ok: false, error: validationError(details) };
  }
  return { ok: true, value: { profile_id, policy_text } };
}

export function validateDemoUserIdHeader(value) {
  const normalized = value == null ? "demo-user" : String(value).trim();
  const details = [];

  if (normalized.length < 1 || normalized.length > 80) {
    details.push({ field: "x-demo-user-id", message: "Must be between 1 and 80 characters" });
  }

  if (details.length > 0) {
    return {
      ok: false,
      error: validationError(details),
    };
  }

  return {
    ok: true,
    value: normalized,
  };
}
