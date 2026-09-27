import postgres from "postgres";
import { getDatabaseUrl } from "@/lib/supabase/config";

let authSchemaReady = false;
let authSchemaPromise: Promise<void> | null = null;

/** Adds username column when Supabase still has the legacy email-only users table. */
export async function ensurePostgresAuthSchema() {
  if (authSchemaReady) return;
  if (authSchemaPromise) return authSchemaPromise;

  authSchemaPromise = (async () => {
    const url = getDatabaseUrl();
    if (!url) return;

    const sql = postgres(url, { prepare: false, ssl: "require", max: 1 });
    try {
      const cols = await sql<{ column_name: string }[]>`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users'
      `;
      const names = new Set(cols.map((c) => c.column_name));
      if (names.size === 0) return;

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
        if (names.has("email")) {
          await sql`ALTER TABLE users ALTER COLUMN email DROP NOT NULL`;
        }
      }
      authSchemaReady = true;
    } finally {
      await sql.end();
    }
  })();

  return authSchemaPromise;
}
