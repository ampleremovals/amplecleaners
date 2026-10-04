/**
 * Run the Ample Cleaners database migrations.
 * Usage: npx tsx scripts/run-migrations.ts
 *
 * Requires DATABASE_URL (Supabase project connection string) in .env.local or
 * the environment — same pattern as Ample Removals' scripts/run-migrations.ts.
 */
import { Client } from "pg";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("❌  DATABASE_URL is not set.");
  console.error("    Format: postgresql://postgres.{PROJECT_REF}:[PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres (use the IPv4 pooler, not db.*.supabase.co which is IPv6-only)");
  process.exit(1);
}

// Every .sql file in supabase/migrations, in name order — each is idempotent.
const MIGRATION_FILES = readdirSync(join(__dirname, "..", "supabase", "migrations")).filter((f) => f.endsWith(".sql")).sort();

async function run() {
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log("✅ Connected to database\n");

  let passed = 0;
  let failed = 0;
  for (const file of MIGRATION_FILES) {
    const sql = readFileSync(join(__dirname, "..", "supabase", "migrations", file), "utf-8");
    try {
      await client.query(sql);
      console.log(`✅  ${file}`);
      passed++;
    } catch (e) {
      console.log(`❌  ${file}: ${e instanceof Error ? e.message : e}`);
      failed++;
    }
  }

  await client.end();
  console.log(`\nDone. ${passed} passed, ${failed} failed.`);
}

run();
