function sanitizeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") return {};
  const out = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (
      value == null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      out[key] = value;
    } else if (Array.isArray(value)) {
      out[key] = value.map((v) =>
        v == null || ["string", "number", "boolean"].includes(typeof v)
          ? v
          : String(v)
      );
    } else {
      out[key] = String(value);
    }
  }
  return out;
}

function log(level, eventName, metadata = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event: eventName,
    ...sanitizeMetadata(metadata),
  };
  console.log(JSON.stringify(payload));
}

export function logInfo(eventName, metadata = {}) {
  log("INFO", eventName, metadata);
}

export function logWarn(eventName, metadata = {}) {
  log("WARN", eventName, metadata);
}

export function logError(eventName, metadata = {}) {
  log("ERROR", eventName, metadata);
}
