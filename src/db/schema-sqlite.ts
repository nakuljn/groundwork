import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  email: text("email"),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const workspaces = sqliteTable("workspaces", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerUserId: integer("owner_user_id").references(() => users.id, { onDelete: "set null" }),
  stripeCustomerId: text("stripe_customer_id"),
  plan: text("plan").notNull().default("free"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const memberships = sqliteTable("memberships", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("owner"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const blueprints = sqliteTable("blueprints", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("draft"),
  blueprintJson: text("blueprint_json").notNull(),
  agentRunId: integer("agent_run_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const agentRuns = sqliteTable("agent_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const usageEvents = sqliteTable("usage_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  units: integer("units").notNull().default(1),
  metaJson: text("meta_json"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const contacts = sqliteTable("contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  lastContactedAt: integer("last_contacted_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const outreachCategories = sqliteTable("outreach_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const activities = sqliteTable("activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").references(() => contacts.id, {
    onDelete: "set null",
  }),
  type: text("type").notNull(),
  channel: text("channel").notNull().default("linkedin"),
  count: integer("count").notNull().default(1),
  note: text("note"),
  outcome: text("outcome"),
  costInr: integer("cost_inr").notNull().default(0),
  costMinor: integer("cost_minor").notNull().default(0),
  currency: text("currency").notNull().default("INR"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const tracks = sqliteTable("tracks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  name: text("name").notNull(),
  channel: text("channel").notNull(),
  goal: text("goal").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

export const trackSteps = sqliteTable("track_steps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  doneAt: integer("done_at", { mode: "timestamp" }),
});

export const researchRuns = sqliteTable("research_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const marketingSettings = sqliteTable("marketing_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id")
    .notNull()
    .unique()
    .references(() => products.id, { onDelete: "cascade" }),
  reminderEnabled: integer("reminder_enabled", { mode: "boolean" })
    .notNull()
    .default(true),
  reminderDay: integer("reminder_day").notNull().default(1),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  weeklyTarget: integer("weekly_target").notNull().default(2),
  postingDays: text("posting_days").notNull().default("[2,4]"),
  postTime: text("post_time").notNull().default("09:30"),
  pastPosts: text("past_posts"),
  voiceGuidance: text("voice_guidance"),
  imageStyle: text("image_style"),
  reminderEmail: text("reminder_email"),
  emailReminderEnabled: integer("email_reminder_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const contentWeeks = sqliteTable("content_weeks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  weekStart: integer("week_start", { mode: "timestamp" }).notNull(),
  topic: text("topic"),
  storyline: text("storyline"),
  status: text("status").notNull().default("active"),
  reminderDismissedAt: integer("reminder_dismissed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const marketingPosts = sqliteTable("marketing_posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contentWeekId: integer("content_week_id")
    .notNull()
    .references(() => contentWeeks.id, { onDelete: "cascade" }),
  sequence: integer("sequence").notNull(),
  role: text("role").notNull(),
  title: text("title"),
  hook: text("hook"),
  scheduledFor: integer("scheduled_for", { mode: "timestamp" }),
  plainText: text("plain_text").notNull().default(""),
  formattedText: text("formatted_text").notNull().default(""),
  imagePrompt: text("image_prompt"),
  imagePath: text("image_path"),
  status: text("status").notNull().default("draft"),
  savedAt: integer("saved_at", { mode: "timestamp" }),
  postedAt: integer("posted_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

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