/**
 * Adds username-based auth to an existing Supabase users table (email-only legacy schema).
 * Run: npx tsx scripts/migrate-postgres-username.ts
 */
import postgres from "postgres";
import { getDatabaseUrl } from "../src/lib/supabase/config";

async function main() {
  const url = getDatabaseUrl();
  if (!url) throw new Error("DATABASE_URL not configured");

  const sql = postgres(url, { prepare: false, ssl: "require", max: 1 });

  const cols = await sql<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users'
  `;
  const names = new Set(cols.map((c) => c.column_name));

  if (!names.has("username")) {
    await sql`ALTER TABLE users ADD COLUMN username TEXT`;
    await sql`
      UPDATE users SET username = COALESCE(
        NULLIF(lower(trim(split_part(email, '@', 1))), ''),
        'user_' || id::text
      )
      WHERE username IS NULL
    `;
    await sql`ALTER TABLE users ALTER COLUMN username SET NOT NULL`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username)`;
    await sql`ALTER TABLE users ALTER COLUMN email DROP NOT NULL`;
    console.log("Added username column and migrated from email");
  } else {
    console.log("username column already exists");
  }

  await sql.end();
  console.log("Postgres auth migration complete");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
