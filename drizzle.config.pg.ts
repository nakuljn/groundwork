import { defineConfig } from "drizzle-kit";

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const ref = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\./)?.[1];
  const password = process.env.SUPABASE_DB_PASSWORD;
  const region = process.env.SUPABASE_REGION?.trim() || "ap-south-1";
  if (ref && password) {
    return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
  }
  throw new Error("Set DATABASE_URL or NEXT_PUBLIC_SUPABASE_URL + SUPABASE_DB_PASSWORD");
}

export default defineConfig({
  schema: "./src/db/postgres-schema.ts",
  out: "./drizzle/supabase",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl(),
  },
});
