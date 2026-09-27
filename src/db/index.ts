import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

if (typeof window !== "undefined") {
  throw new Error("@/db cannot be imported in client code");
}

type Db = BetterSQLite3Database<typeof schema>;

let sqlite: Database.Database | null = null;
let drizzleDb: Db | null = null;
let schemaReady = false;

function getSqlite() {
  if (sqlite) return sqlite;

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "groundwork.db");
  sqlite = new Database(dbPath);
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return sqlite;
}

function ensureSchema() {
  if (schemaReady) return;
  const db = getSqlite();

  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      one_liner TEXT,
      audience TEXT,
      offer TEXT,
      goal TEXT,
      website_url TEXT,
      repo_path TEXT,
      brief TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT,
      org TEXT,
      city TEXT,
      profile_url TEXT,
      email TEXT,
      notes TEXT,
      source_channel TEXT NOT NULL DEFAULT 'linkedin',
      category TEXT NOT NULL DEFAULT 'advocate',
      status TEXT NOT NULL DEFAULT 'new',
      last_contacted_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'linkedin',
      count INTEGER NOT NULL DEFAULT 1,
      note TEXT,
      outcome TEXT,
      cost_inr INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      name TEXT NOT NULL,
      channel TEXT NOT NULL,
      goal TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS track_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      title TEXT NOT NULL,
      why TEXT NOT NULL,
      instructions TEXT NOT NULL,
      asset_text TEXT,
      tool_suggestion TEXT,
      agent TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      done_at INTEGER
    );

    DROP TABLE IF EXISTS actions;

    CREATE TABLE IF NOT EXISTS research_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      target TEXT NOT NULL,
      location TEXT,
      guide TEXT NOT NULL,
      results TEXT NOT NULL DEFAULT '[]',
      added TEXT NOT NULL DEFAULT '[]',
      source_count INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  const activityColumns = db
    .prepare("PRAGMA table_info(activities)")
    .all() as { name: string }[];
  if (!activityColumns.some((c) => c.name === "cost_inr")) {
    db.exec("ALTER TABLE activities ADD COLUMN cost_inr INTEGER NOT NULL DEFAULT 0");
  }

  // Cost used to live in a separate expenses table; fold it into the activity log.
  const hasExpenses = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='expenses'")
    .get();
  if (hasExpenses) {
    db.transaction(() => {
      db.exec(`
        INSERT INTO activities (product_id, type, channel, count, note, cost_inr, created_at)
        SELECT product_id, 'purchase', channel, 1,
               label || COALESCE(' · ' || campaign, ''), amount_inr, date
        FROM expenses;
        DROP TABLE expenses;
      `);
    })();
  }

  const stepColumns = db
    .prepare("PRAGMA table_info(track_steps)")
    .all() as { name: string }[];
  if (stepColumns.some((c) => c.name === "app_link") && !stepColumns.some((c) => c.name === "agent")) {
    db.exec("ALTER TABLE track_steps ADD COLUMN agent TEXT");
    db.exec(`
      UPDATE track_steps SET agent = CASE app_link
        WHEN '/find' THEN 'find_prospects'
        WHEN '/people' THEN 'draft_messages'
        ELSE NULL
      END
    `);
  } else if (!stepColumns.some((c) => c.name === "agent")) {
    db.exec("ALTER TABLE track_steps ADD COLUMN agent TEXT");
  }

  db.exec(`
    UPDATE track_steps SET agent = 'find_prospects'
    WHERE agent IS NULL AND position = 2
      AND track_id IN (SELECT id FROM tracks WHERE key IN ('linkedin_sales', 'cold_email'));
    UPDATE track_steps SET agent = 'draft_messages'
    WHERE agent IS NULL AND position = 3
      AND track_id IN (SELECT id FROM tracks WHERE key IN ('linkedin_sales', 'cold_email'));
    UPDATE track_steps SET
      instructions = 'Click Find prospects. Groundwork searches the web, skips people already on your list, and shows who fits.',
      tool_suggestion = NULL,
      asset_text = NULL
    WHERE agent = 'find_prospects';
    UPDATE track_steps SET
      instructions = 'Draft messages for advocates and for each role at a firm (managing partner, partner, senior associate, associate). Copy the set that matches who you are writing to.',
      tool_suggestion = NULL,
      asset_text = NULL
    WHERE agent = 'draft_messages';
  `);

  const productColumns = db
    .prepare("PRAGMA table_info(products)")
    .all() as { name: string }[];
  if (!productColumns.some((c) => c.name === "sender_name")) {
    db.exec("ALTER TABLE products ADD COLUMN sender_name TEXT");
    db.exec("ALTER TABLE products ADD COLUMN sender_title TEXT");
    db.exec("ALTER TABLE products ADD COLUMN sender_contact TEXT");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS outreach_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      linkedin_note TEXT,
      cold_email TEXT,
      follow_up TEXT,
      linkedin_message TEXT,
      inmail TEXT,
      linkedin_follow_up TEXT,
      saved_fields TEXT NOT NULL DEFAULT '[]',
      updated_at INTEGER NOT NULL,
      UNIQUE(product_id, key)
    );
  `);

  const categoryColumns = db
    .prepare("PRAGMA table_info(outreach_categories)")
    .all() as { name: string }[];
  for (const column of ["linkedin_message", "inmail", "linkedin_follow_up"]) {
    if (!categoryColumns.some((c) => c.name === column)) {
      db.exec(`ALTER TABLE outreach_categories ADD COLUMN ${column} TEXT`);
    }
  }
  if (!categoryColumns.some((c) => c.name === "saved_fields")) {
    db.exec("ALTER TABLE outreach_categories ADD COLUMN saved_fields TEXT NOT NULL DEFAULT '[]'");
  }

  const contactColumns = db
    .prepare("PRAGMA table_info(contacts)")
    .all() as { name: string }[];
  if (!contactColumns.some((c) => c.name === "category")) {
    db.exec("ALTER TABLE contacts ADD COLUMN category TEXT NOT NULL DEFAULT 'advocate'");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS marketing_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
      reminder_enabled INTEGER NOT NULL DEFAULT 1,
      reminder_day INTEGER NOT NULL DEFAULT 1,
      timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      weekly_target INTEGER NOT NULL DEFAULT 3,
      voice_guidance TEXT,
      image_style TEXT,
      reminder_email TEXT,
      email_reminder_enabled INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS content_weeks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      week_start INTEGER NOT NULL,
      topic TEXT,
      storyline TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      reminder_dismissed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(product_id, week_start)
    );

    CREATE TABLE IF NOT EXISTS marketing_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_week_id INTEGER NOT NULL REFERENCES content_weeks(id) ON DELETE CASCADE,
      sequence INTEGER NOT NULL,
      role TEXT NOT NULL,
      title TEXT,
      plain_text TEXT NOT NULL DEFAULT '',
      formatted_text TEXT NOT NULL DEFAULT '',
      image_prompt TEXT,
      image_path TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      saved_at INTEGER,
      posted_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(content_week_id, sequence)
    );

    CREATE INDEX IF NOT EXISTS marketing_posts_week_idx
      ON marketing_posts(content_week_id);
  `);

  const marketingSettingsColumns = db
    .prepare("PRAGMA table_info(marketing_settings)")
    .all() as { name: string }[];
  if (!marketingSettingsColumns.some((c) => c.name === "posting_days")) {
    db.exec("ALTER TABLE marketing_settings ADD COLUMN posting_days TEXT NOT NULL DEFAULT '[2,4]'");
  }
  if (!marketingSettingsColumns.some((c) => c.name === "post_time")) {
    db.exec("ALTER TABLE marketing_settings ADD COLUMN post_time TEXT NOT NULL DEFAULT '09:30'");
  }
  if (!marketingSettingsColumns.some((c) => c.name === "past_posts")) {
    db.exec("ALTER TABLE marketing_settings ADD COLUMN past_posts TEXT");
  }

  const marketingPostColumns = db
    .prepare("PRAGMA table_info(marketing_posts)")
    .all() as { name: string }[];
  if (!marketingPostColumns.some((c) => c.name === "scheduled_for")) {
    db.exec("ALTER TABLE marketing_posts ADD COLUMN scheduled_for INTEGER");
  }
  if (!marketingPostColumns.some((c) => c.name === "hook")) {
    db.exec("ALTER TABLE marketing_posts ADD COLUMN hook TEXT");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      stripe_customer_id TEXT,
      plan TEXT NOT NULL DEFAULT 'free',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS memberships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'owner',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS blueprints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      version INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'draft',
      blueprint_json TEXT NOT NULL,
      agent_run_id INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS agent_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      graph TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      input_json TEXT,
      output_json TEXT,
      error TEXT,
      tokens_used INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS usage_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      units INTEGER NOT NULL DEFAULT 1,
      meta_json TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  const productCols = db.prepare("PRAGMA table_info(products)").all() as { name: string }[];
  if (!productCols.some((c) => c.name === "workspace_id")) {
    db.exec("ALTER TABLE products ADD COLUMN workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE");
  }

  const activityCols = db.prepare("PRAGMA table_info(activities)").all() as { name: string }[];
  if (!activityCols.some((c) => c.name === "cost_minor")) {
    db.exec("ALTER TABLE activities ADD COLUMN cost_minor INTEGER NOT NULL DEFAULT 0");
    db.exec("UPDATE activities SET cost_minor = cost_inr WHERE cost_minor = 0");
  }
  if (!activityCols.some((c) => c.name === "currency")) {
    db.exec("ALTER TABLE activities ADD COLUMN currency TEXT NOT NULL DEFAULT 'INR'");
  }

  schemaReady = true;
}

export function getDb(): Db {
  const { isPostgresEnabled, getPostgresDb } = require("./postgres") as typeof import("./postgres");
  if (isPostgresEnabled()) {
    return getPostgresDb() as unknown as Db;
  }
  ensureSchema();
  if (!drizzleDb) {
    drizzleDb = drizzle(getSqlite(), { schema });
  }
  return drizzleDb;
}

/** @deprecated use getDb() — kept for existing imports */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
});
