/**
 * One-shot backend verification: GET /profiles, POST /profiles, POST /analyze.
 * Run with server already up: BASE=http://127.0.0.1:3001 node scripts/verify-backend.mjs
 */
const BASE = process.env.BASE || "http://127.0.0.1:3001";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  let r = await fetch(`${BASE}/profiles`);
  assert(r.ok, `GET /profiles HTTP ${r.status}`);
  const list = await r.json();
  assert(Array.isArray(list), "GET /profiles must return an array");

  const body = {
    name: "Verify User",
    age: 30,
    state: "TX",
    employment_status: "employed",
    citizenship: "US",
    housing: "rent",
    has_dependents: 0,
    dependents_count: 0,
    university: null,
    degree_level: null,
    financial_aid: null,
    industry: "retail",
    employment_type: "full_time",
    income_bracket: "40k_60k",
    business_type: null,
    num_employees: null,
  };

  r = await fetch(`${BASE}/profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  assert(r.ok, `POST /profiles HTTP ${r.status}`);
  const created = await r.json();
  assert(created?.id != null, "POST /profiles must return id");

  const policy_text =
    "Starting next year, low-income renters may receive a small monthly tax credit.";

  r = await fetch(`${BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile_id: created.id, policy_text }),
  });
  const analyzed = await r.json();
  assert(r.ok, `POST /analyze HTTP ${r.status}: ${JSON.stringify(analyzed)}`);

  for (const key of ["policy_title", "summary", "overall_impact", "sections"]) {
    assert(key in analyzed, `Missing field: ${key}`);
  }
  assert(typeof analyzed.policy_title === "string", "policy_title must be string");
  assert(typeof analyzed.summary === "string", "summary must be string");
  assert(typeof analyzed.overall_impact === "string", "overall_impact must be string");
  assert(Array.isArray(analyzed.sections), "sections must be array");

  console.log("\n=== Verification OK ===\n");
  console.log("--- Final JSON from POST /analyze ---\n");
  console.log(JSON.stringify(analyzed, null, 2));
}

main().catch((e) => {
  console.error("VERIFY_FAILED:", e.message);
  process.exit(1);
});
