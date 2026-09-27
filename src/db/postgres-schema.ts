/**
 * Postgres schema for Supabase (production).
 * Local dev uses SQLite in schema.ts; run `npm run db:migrate:supabase` when DATABASE_URL is set.
 */
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email"),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const workspaces = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerUserId: integer("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  stripeCustomerId: text("stripe_customer_id"),
  plan: text("plan").notNull().default("free"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("membership_unique").on(t.workspaceId, t.userId)],
);

export const blueprints = pgTable("blueprints", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("draft"),
  blueprintJson: text("blueprint_json").notNull(),
  agentRunId: integer("agent_run_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const agentRuns = pgTable("agent_runs", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  graph: text("graph").notNull(),
  threadId: text("thread_id").notNull(),
  status: text("status").notNull().default("running"),
  inputJson: text("input_json"),
  outputJson: text("output_json"),
  error: text("error"),
  tokensUsed: integer("tokens_used").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const usageEvents = pgTable("usage_events", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  units: integer("units").notNull().default(1),
  metaJson: text("meta_json"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  oneLiner: text("one_liner"),
  audience: text("audience"),
  offer: text("offer"),
  goal: text("goal"),
  websiteUrl: text("website_url"),
  repoPath: text("repo_path"),
  brief: text("brief"),
  senderName: text("sender_name"),
  senderTitle: text("sender_title"),
  senderContact: text("sender_contact"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role"),
  org: text("org"),
  city: text("city"),
  profileUrl: text("profile_url"),
  email: text("email"),
  notes: text("notes"),
  sourceChannel: text("source_channel").notNull().default("linkedin"),
  category: text("category").notNull().default("advocate"),
  status: text("status").notNull().default("new"),
  lastContactedAt: timestamp("last_contacted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const outreachCategories = pgTable(
  "outreach_categories",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    linkedinNote: text("linkedin_note"),
    coldEmail: text("cold_email"),
    followUp: text("follow_up"),
    linkedinMessage: text("linkedin_message"),
    inmail: text("inmail"),
    linkedinFollowUp: text("linkedin_follow_up"),
    savedFields: text("saved_fields").notNull().default("[]"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("outreach_category_unique").on(t.productId, t.key)],
);

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  channel: text("channel").notNull().default("linkedin"),
  count: integer("count").notNull().default(1),
  note: text("note"),
  outcome: text("outcome"),
  costInr: integer("cost_inr").notNull().default(0),
  costMinor: integer("cost_minor").notNull().default(0),
  currency: text("currency").notNull().default("INR"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tracks = pgTable("tracks", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  name: text("name").notNull(),
  channel: text("channel").notNull(),
  goal: text("goal").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const trackSteps = pgTable("track_steps", {
  id: serial("id").primaryKey(),
  trackId: integer("track_id")
    .notNull()
    .references(() => tracks.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  title: text("title").notNull(),
  why: text("why").notNull(),
  instructions: text("instructions").notNull(),
  assetText: text("asset_text"),
  toolSuggestion: text("tool_suggestion"),
  agent: text("agent"),
  status: text("status").notNull().default("todo"),
  doneAt: timestamp("done_at"),
});

export const researchRuns = pgTable("research_runs", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  target: text("target").notNull(),
  location: text("location"),
  guide: text("guide").notNull(),
  results: text("results").notNull().default("[]"),
  added: text("added").notNull().default("[]"),
  sourceCount: integer("source_count").notNull().default(0),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const marketingSettings = pgTable("marketing_settings", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .unique()
    .references(() => products.id, { onDelete: "cascade" }),
  reminderEnabled: boolean("reminder_enabled").notNull().default(true),
  reminderDay: integer("reminder_day").notNull().default(1),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  weeklyTarget: integer("weekly_target").notNull().default(2),
  postingDays: text("posting_days").notNull().default("[2,4]"),
  postTime: text("post_time").notNull().default("09:30"),
  pastPosts: text("past_posts"),
  voiceGuidance: text("voice_guidance"),
  imageStyle: text("image_style"),
  reminderEmail: text("reminder_email"),
  emailReminderEnabled: boolean("email_reminder_enabled").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const contentWeeks = pgTable(
  "content_weeks",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    weekStart: timestamp("week_start").notNull(),
    topic: text("topic"),
    storyline: text("storyline"),
    status: text("status").notNull().default("active"),
    reminderDismissedAt: timestamp("reminder_dismissed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("content_week_unique").on(t.productId, t.weekStart)],
);

export const marketingPosts = pgTable(
  "marketing_posts",
  {
    id: serial("id").primaryKey(),
    contentWeekId: integer("content_week_id")
      .notNull()
      .references(() => contentWeeks.id, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
    role: text("role").notNull(),
    title: text("title"),
    hook: text("hook"),
    scheduledFor: timestamp("scheduled_for"),
    plainText: text("plain_text").notNull().default(""),
    formattedText: text("formatted_text").notNull().default(""),
    imagePrompt: text("image_prompt"),
    imagePath: text("image_path"),
    status: text("status").notNull().default("draft"),
    savedAt: timestamp("saved_at"),
    postedAt: timestamp("posted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("marketing_post_unique").on(t.contentWeekId, t.sequence)],
);
