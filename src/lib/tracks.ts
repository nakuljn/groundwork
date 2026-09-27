import { and, asc, count, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  activities,
  contacts,
  products,
  trackSteps,
  tracks,
} from "@/db/schema";
import type { TrackWithSteps } from "./track-types";
import { generate } from "./ai";

export const MAX_ACTIVE_TRACKS = 2;

export type TrackTemplate = {
  key: string;
  name: string;
  channel: string;
  activityType: string;
  goal: string;
  summary: string;
  skeleton: string[];
};

export type TrackAgent = "find_prospects" | "draft_messages";

/** Which skeleton step gets an inline agent, per track key (1-based position). */
const STEP_AGENTS: Record<string, Record<number, TrackAgent>> = {
  linkedin_sales: { 2: "find_prospects", 3: "draft_messages" },
  cold_email: { 2: "find_prospects", 3: "draft_messages" },
};

export const TRACK_TEMPLATES: TrackTemplate[] = [
  {
    key: "linkedin_sales",
    name: "LinkedIn sales",
    channel: "linkedin",
    activityType: "linkedin_outreach",
    goal: "Book demos with decision-makers through direct LinkedIn outreach.",
    summary: "The core sales track. Find the right people, connect, message, follow up and book demos.",
    skeleton: [
      "Make your LinkedIn profile read like the product's front door (headline, about, featured)",
      "Build your first list of 20-30 prospects — Groundwork will search and reason about who fits",
      "Write a personal connection note for each prospect on your list",
      "Send the first batch of connection requests (15-20 a day, under the weekly limit)",
      "Message everyone who accepted with a short, specific opener and a demo or trial offer",
      "Follow up with people who read but did not reply, 3-4 days later",
      "Run demos, then ask each person for feedback and one referral",
      "Review what worked (acceptance and reply rate) and rewrite the note for the next batch",
    ],
  },
  {
    key: "cold_email",
    name: "Cold email",
    channel: "email",
    activityType: "cold_email",
    goal: "Start conversations by email with firms that publish contact details.",
    summary: "For prospects with public emails: firm websites, directories, bar association lists.",
    skeleton: [
      "Set up a sending address and signature that looks professional (not a free Gmail if avoidable)",
      "Build a list of 30 prospects with public emails — Groundwork will search for them",
      "Write a personal cold email for each prospect on your list",
      "Send the first 10-15 emails by hand and log them",
      "Send follow-ups to non-repliers after 3-4 days",
      "Reply fast to everyone who answers and offer a short demo",
      "Review open and reply rates and rewrite the subject line and first sentence",
    ],
  },
  {
    key: "linkedin_content",
    name: "LinkedIn content",
    channel: "linkedin",
    activityType: "post",
    goal: "Build credibility so people accept requests and reply to outreach.",
    summary: "Slow-burn trust. Posts that show the product solving a real problem for the audience.",
    skeleton: [
      "Pick 3 topics the audience cares about that the product has a strong answer to",
      "Write and publish a first post: the problem you saw and why you built the product",
      "Publish a short demo post (screen recording or before/after)",
      "Comment thoughtfully on 10 posts from people in your target audience",
      "Publish a post with a concrete tip or result the audience can use today",
      "Message people who engaged with your posts and offer a demo",
      "Review which post got the most reach and plan the next three like it",
    ],
  },
  {
    key: "community",
    name: "Communities and referrals",
    channel: "offline",
    activityType: "other",
    goal: "Get introduced through groups, associations and the people you already know.",
    summary: "Warm intros convert best. Use WhatsApp groups, associations, events and friends.",
    skeleton: [
      "List 10 people you know who are in or close to the target audience",
      "Message each one personally asking for feedback, not a sale",
      "Find 3 communities where the audience gathers (associations, WhatsApp or Telegram groups, forums)",
      "Join them and contribute something useful before mentioning the product",
      "Share a short, helpful post in each community with an offer to try the product",
      "Ask every happy user for one introduction to a peer",
      "Review which source brought real users and double down on it",
    ],
  },
];

export function getTemplate(key: string) {
  return TRACK_TEMPLATES.find((t) => t.key === key);
}

const stepsSchema = z.object({
  steps: z
    .array(
      z.object({
        title: z.string(),
        why: z.string(),
        instructions: z.string(),
        assetText: z.string().nullish(),
        toolSuggestion: z.string().nullish(),
      }),
    )
    .min(4)
    .max(10),
});

function agentForStep(trackKey: string, position: number): TrackAgent | null {
  return STEP_AGENTS[trackKey]?.[position] ?? null;
}

export function resolveStepAgent(
  trackKey: string,
  position: number,
  stored: string | null,
): TrackAgent | null {
  if (stored === "find_prospects" || stored === "draft_messages") return stored;
  return agentForStep(trackKey, position);
}

const AGENT_INSTRUCTIONS: Record<TrackAgent, string> = {
  find_prospects:
    "Click Find prospects. Groundwork searches the web, skips people already on your list, and shows who fits.",
  draft_messages:
    "Draft messages for advocates and for each role at a firm (managing partner, partner, senior associate, associate). Copy the set that matches who you are writing to.",
};

export async function startTrack(productId: number, key: string) {
  const template = getTemplate(key);
  if (!template) throw new Error("Unknown track");

  const [{ value: activeCount }] = await db
    .select({ value: count() })
    .from(tracks)
    .where(and(eq(tracks.productId, productId), eq(tracks.status, "active")));
  if (activeCount >= MAX_ACTIVE_TRACKS) {
    throw new Error(`You can run ${MAX_ACTIVE_TRACKS} tracks at a time. Pause one first.`);
  }

  const [existing] = await db
    .select({ id: tracks.id })
    .from(tracks)
    .where(
      and(
        eq(tracks.productId, productId),
        eq(tracks.key, key),
        inArray(tracks.status, ["active", "paused"]),
      ),
    );
  if (existing) throw new Error("This track is already running or paused. Resume it instead.");

  const [product] = await db.select().from(products).where(eq(products.id, productId));
  if (!product) throw new Error("Product not found");

  const [{ value: contactCount }] = await db
    .select({ value: count() })
    .from(contacts)
    .where(eq(contacts.productId, productId));

  const result = await generate({
    system: `You are a hands-on sales coach for a solo founder. Turn a track skeleton into concrete, ordered steps for this specific product.
Rules:
- Keep the skeleton's order and intent. One step per skeleton item.
- "title": short imperative, specific to the product and audience.
- "why": one sentence.
- "instructions": numbered, click-by-click steps the founder can follow without thinking. Include exact numbers (how many, how often).
- When a step is about building a prospect list, say Groundwork will find and reason about matches right in this step — do NOT tell them to research manually or go to another page.
- When a step is about writing outreach, say they will draft messages for each prospect inline in this step.
- "assetText": ready-to-copy text when the step involves writing (profile headline, message template, post, email). Empty string otherwise. LinkedIn connection notes must be under 300 characters.
- "toolSuggestion": one free or cheap tool if genuinely useful, else empty string. Never suggest LinkedIn automation or scraping tools.
Return JSON: {"steps":[{"title":"","why":"","instructions":"","assetText":"","toolSuggestion":""}]}`,
    prompt: `Product: ${product.name}
One-liner: ${product.oneLiner ?? ""}
Audience: ${product.audience ?? ""}
Offer: ${product.offer ?? ""}
Goal: ${product.goal ?? ""}
Brief: ${product.brief ?? "none"}
Prospects already saved: ${contactCount}

Track: ${template.name} — ${template.goal}
Skeleton:
${template.skeleton.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    schema: stepsSchema,
    task: "writing",
  });

  const [track] = await db
    .insert(tracks)
    .values({
      productId,
      key: template.key,
      name: template.name,
      channel: template.channel,
      goal: template.goal,
      status: "active",
    })
    .returning();

  await db.insert(trackSteps).values(
    result.steps.map((s, i) => {
      const agent = agentForStep(template.key, i + 1);
      return {
        trackId: track.id,
        position: i + 1,
        title: s.title,
        why: s.why,
        instructions: agent ? AGENT_INSTRUCTIONS[agent] : s.instructions,
        assetText: agent ? null : s.assetText || null,
        toolSuggestion: agent ? null : s.toolSuggestion || null,
        agent,
      };
    }),
  );

  return track;
}

export type { TrackWithSteps } from "./track-types";

export async function getTracks(productId: number): Promise<TrackWithSteps[]> {
  const rows = await db
    .select()
    .from(tracks)
    .where(eq(tracks.productId, productId))
    .orderBy(asc(tracks.createdAt));
  if (rows.length === 0) return [];

  const steps = await db
    .select()
    .from(trackSteps)
    .where(inArray(trackSteps.trackId, rows.map((t) => t.id)))
    .orderBy(asc(trackSteps.position));

  return rows.map((t) => {
    const own = steps.filter((s) => s.trackId === t.id).map((s) => ({
      ...s,
      agent: resolveStepAgent(t.key, s.position, s.agent),
    }));
    const current = own.find((s) => s.status === "todo") ?? null;
    return {
      ...t,
      steps: own,
      current,
      finished: own.filter((s) => s.status !== "todo").length,
    };
  });
}

export async function finishStep(stepId: number, outcome: "done" | "skipped") {
  const [step] = await db.select().from(trackSteps).where(eq(trackSteps.id, stepId));
  if (!step) throw new Error("Step not found");
  const [track] = await db.select().from(tracks).where(eq(tracks.id, step.trackId));
  if (!track) throw new Error("Track not found");

  await db
    .update(trackSteps)
    .set({ status: outcome, doneAt: new Date() })
    .where(eq(trackSteps.id, stepId));

  if (outcome === "done") {
    await db.insert(activities).values({
      productId: track.productId,
      type: getTemplate(track.key)?.activityType ?? "other",
      channel: track.channel,
      count: 1,
      note: `${track.name}: ${step.title}`,
    });
  }

  const [{ value: remaining }] = await db
    .select({ value: count() })
    .from(trackSteps)
    .where(and(eq(trackSteps.trackId, track.id), eq(trackSteps.status, "todo")));

  if (remaining === 0) {
    await db
      .update(tracks)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(tracks.id, track.id));
  }

  return { trackCompleted: remaining === 0 };
}

export async function setTrackStatus(trackId: number, status: "active" | "paused") {
  const [track] = await db.select().from(tracks).where(eq(tracks.id, trackId));
  if (!track) throw new Error("Track not found");

  if (status === "active") {
    const [{ value: activeCount }] = await db
      .select({ value: count() })
      .from(tracks)
      .where(and(eq(tracks.productId, track.productId), eq(tracks.status, "active")));
    if (activeCount >= MAX_ACTIVE_TRACKS) {
      throw new Error(`You can run ${MAX_ACTIVE_TRACKS} tracks at a time. Pause one first.`);
    }
  }

  await db.update(tracks).set({ status }).where(eq(tracks.id, trackId));
}

export async function deleteTrack(trackId: number) {
  await db.delete(tracks).where(eq(tracks.id, trackId));
}
