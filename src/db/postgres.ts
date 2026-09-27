import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { getDatabaseUrl, isProductionDatabaseEnabled } from "@/lib/supabase/config";
import * as schema from "./postgres-schema";

let sql: postgres.Sql | null = null;
let postgresDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getPostgresDb() {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error(
      "Supabase Postgres not configured. Set DATABASE_URL or SUPABASE_DB_PASSWORD in .env.local",
    );
  }
  if (!postgresDb) {
    sql = postgres(url, {
      prepare: false,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    postgresDb = drizzle(sql, { schema });
  }
  return postgresDb;
}

export function isPostgresEnabled() {
  return isProductionDatabaseEnabled();
}

/** @deprecated use isPostgresEnabled */
export { isProductionDatabaseEnabled as isSupabaseEnabled };
