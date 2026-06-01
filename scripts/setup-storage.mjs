// Create the public Storage buckets Roomora needs (idempotent).
// Usage: node scripts/setup-storage.mjs
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

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
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKETS = ["rooms", "designs"];

for (const id of BUCKETS) {
  const { error } = await admin.storage.createBucket(id, {
    public: true,
    fileSizeLimit: "20MB",
  });
  if (error) {
    if (/already exists/i.test(error.message)) {
      // Ensure it is public (in case it pre-existed as private).
      await admin.storage.updateBucket(id, { public: true });
      console.log(`Bucket "${id}" exists — ensured public.`);
    } else {
      console.error(`Failed to create bucket "${id}":`, error.message);
      process.exit(1);
    }
  } else {
    console.log(`Bucket "${id}" created (public).`);
  }
}

const { data: list } = await admin.storage.listBuckets();
console.log(
  "Buckets now:",
  JSON.stringify((list ?? []).map((b) => ({ id: b.id, public: b.public }))),
);
