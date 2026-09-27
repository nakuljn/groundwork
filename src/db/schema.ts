/**
 * Active schema — SQLite locally, Postgres (Supabase) when DATABASE_URL is set.
 * Table definitions differ (timestamps as integers vs timestamp), so we must not
 * use the SQLite schema against Postgres or inserts fail.
 */
import { isProductionDatabaseEnabled } from "@/lib/supabase/config";

type SqliteSchema = typeof import("./schema-sqlite");

function load(): SqliteSchema {
  if (isProductionDatabaseEnabled()) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("./postgres-schema") as SqliteSchema;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("./schema-sqlite") as SqliteSchema;
}

const s = load();

export const users = s.users;
export const sessions = s.sessions;
export const workspaces = s.workspaces;
export const memberships = s.memberships;
export const blueprints = s.blueprints;
export const agentRuns = s.agentRuns;
export const usageEvents = s.usageEvents;
export const products = s.products;
export const contacts = s.contacts;
export const outreachCategories = s.outreachCategories;
export const activities = s.activities;
export const tracks = s.tracks;
export const trackSteps = s.trackSteps;
export const researchRuns = s.researchRuns;
export const marketingSettings = s.marketingSettings;
export const contentWeeks = s.contentWeeks;
export const marketingPosts = s.marketingPosts;

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type BlueprintRow = typeof blueprints.$inferSelect;
export type AgentRun = typeof agentRuns.$inferSelect;
export type UsageEvent = typeof usageEvents.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ResearchRun = typeof researchRuns.$inferSelect;
export type OutreachCategory = typeof outreachCategories.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Track = typeof tracks.$inferSelect;
export type TrackStep = typeof trackSteps.$inferSelect;
export type MarketingSettings = typeof marketingSettings.$inferSelect;
export type ContentWeek = typeof contentWeeks.$inferSelect;
export type MarketingPost = typeof marketingPosts.$inferSelect;
