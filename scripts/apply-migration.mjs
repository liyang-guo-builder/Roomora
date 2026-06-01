// Apply a .sql migration to Supabase via the Management API.
// Usage: node scripts/apply-migration.mjs supabase/migrations/0001_auth_credits.sql
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv(path) {
  const out = {};
  try {
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    }
  } catch {
    // ignore missing file; fall back to process.env
  }
  return out;
}

const env = { ...loadEnv(resolve(process.cwd(), ".env.local")), ...process.env };

const token = env.SUPABASE_ACCESS_TOKEN;
const ref = env.SUPABASE_PROJECT_REF;
if (!token || !ref) {
  console.error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF in .env.local");
  process.exit(1);
}

const sqlPath = process.argv[2] ?? "supabase/migrations/0001_auth_credits.sql";
const sql = readFileSync(resolve(process.cwd(), sqlPath), "utf8");

async function runQuery(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { ok: res.ok, status: res.status, json };
}

const applied = await runQuery(sql);
if (!applied.ok) {
  console.error("Migration FAILED:", JSON.stringify(applied.json, null, 2));
  process.exit(1);
}
console.log("Migration applied OK. Response:", JSON.stringify(applied.json));

// Verify tables + functions exist.
const verify = await runQuery(`
  select table_name from information_schema.tables
  where table_schema = 'public' and table_name in ('profiles','credit_transactions')
  order by table_name;
`);
console.log("Tables present:", JSON.stringify(verify.json));

const fns = await runQuery(`
  select routine_name from information_schema.routines
  where routine_schema = 'public'
    and routine_name in ('handle_new_user','spend_credits','add_credits')
  order by routine_name;
`);
console.log("Functions present:", JSON.stringify(fns.json));
