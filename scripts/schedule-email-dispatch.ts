/**
 * Installs the email engine's timer INSIDE the database: Supabase pg_cron calls
 * /api/cron/email-dispatch every 5 minutes through pg_net. (Vercel Hobby only allows two daily crons.)
 *
 *   npx tsx --env-file=.env.local scripts/schedule-email-dispatch.ts
 *
 * Needs DATABASE_URL, CRON_SECRET (must equal the CRON_SECRET set on Vercel) and optionally
 * NEXT_PUBLIC_SITE_URL. Safe to re-run: it replaces the existing job. Add `--remove` to uninstall.
 * Afterwards it fires the job once and prints what the website answered.
 */
import { Client } from "pg";

const JOB = "email-dispatch";

async function main() {
  const { DATABASE_URL, CRON_SECRET } = process.env;
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.amplecleaners.com").replace(/\/$/, "");
  if (!DATABASE_URL || !CRON_SECRET) throw new Error("DATABASE_URL and CRON_SECRET must be set");
  const db = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  try {
    await db.query("CREATE EXTENSION IF NOT EXISTS pg_cron");
    await db.query("CREATE EXTENSION IF NOT EXISTS pg_net");
    await db.query("SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = $1", [JOB]);
    if (process.argv.includes("--remove")) { console.log(`Removed the "${JOB}" job.`); return; }

    const command = `SELECT net.http_post(url := '${site}/api/cron/email-dispatch', headers := jsonb_build_object('Authorization', 'Bearer ${CRON_SECRET.replace(/'/g, "''")}', 'Content-Type', 'application/json'), body := '{}'::jsonb, timeout_milliseconds := 60000)`;
    await db.query("SELECT cron.schedule($1, '*/5 * * * *', $2)", [JOB, command]);
    console.log(`Scheduled "${JOB}" every 5 minutes -> ${site}/api/cron/email-dispatch`);

    // Fire once now and show the answer, so we know the secret and the URL really work.
    const { rows } = await db.query("SELECT net.http_post(url := $1, headers := jsonb_build_object('Authorization', 'Bearer ' || $2), body := '{}'::jsonb, timeout_milliseconds := 60000) AS id", [`${site}/api/cron/email-dispatch`, CRON_SECRET]);
    const id = rows[0].id;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await db.query("SELECT status_code, left(content, 300) AS body, error_msg FROM net._http_response WHERE id = $1", [id]);
      if (res.rows[0]) { console.log("First call:", JSON.stringify(res.rows[0])); return; }
    }
    console.log("No answer within a minute (the website may still be deploying). Check net._http_response later.");
  } finally {
    await db.end();
  }
}

main().catch((e) => { console.error("FAILED:", e instanceof Error ? e.message : e); process.exit(1); });
