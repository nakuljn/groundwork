/**
 * Adds username-based auth to an existing Supabase users table (email-only legacy schema).
 * Run: npm run db:migrate:username
 */
import { ensurePostgresAuthSchema } from "../src/db/ensure-postgres-auth-schema";

async function main() {
  await ensurePostgresAuthSchema();
  console.log("Postgres auth migration complete");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
