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
import type { Blueprint } from "./blueprint/schema";
import { getTrackTemplate, trackTemplates } from "./blueprint/helpers";
import { LEGAL_INDIA_BLUEPRINT } from "./blueprint/legal-india.fixture";

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

function stepAgentsFromBlueprint(blueprint: Blueprint, trackKey: string): Record<number, TrackAgent> {
  const template = getTrackTemplate(blueprint, trackKey);
  if (!template) return {};
  const map: Record<number, TrackAgent> = {};
  for (const [pos, agent] of Object.entries(template.stepAgents)) {
    map[Number(pos)] = agent;
  }
  return map;
}

function trackTemplatesAsLegacy(blueprint: Blueprint): TrackTemplate[] {
  return trackTemplates(blueprint).map((t) => ({
    key: t.key,
    name: t.name,
    channel: t.channel,
    activityType: t.activityType,
    goal: t.goal,
    summary: t.summary,
    skeleton: t.skeleton,
  }));
}

/** @deprecated use getTrackTemplates(blueprint) */
export const TRACK_TEMPLATES: TrackTemplate[] = trackTemplatesAsLegacy(LEGAL_INDIA_BLUEPRINT);

export function getTrackTemplates(blueprint: Blueprint): TrackTemplate[] {
  return trackTemplatesAsLegacy(blueprint);
}

export function getTemplate(key: string, blueprint: Blueprint = LEGAL_INDIA_BLUEPRINT) {
  return getTrackTemplates(blueprint).find((t) => t.key === key);
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

function agentForStep(
  blueprint: Blueprint,
  trackKey: string,
  position: number,
): TrackAgent | null {
  return stepAgentsFromBlueprint(blueprint, trackKey)[position] ?? null;
}

export function resolveStepAgent(
  trackKey: string,
  position: number,
  stored: string | null,
  blueprint: Blueprint = LEGAL_INDIA_BLUEPRINT,
): TrackAgent | null {
  if (stored === "find_prospects" || stored === "draft_messages") return stored;
  return agentForStep(blueprint, trackKey, position);
}

function agentInstructions(blueprint: Blueprint, agent: TrackAgent): string {
  for (const track of blueprint.tracks) {
    const text = track.agentInstructions?.[agent];
    if (text) return text;
  }
  if (agent === "find_prospects") {
    return "Click Find prospects. Groundwork searches the web, skips people already on your list, and shows who fits.";
  }
  return "Draft messages for each audience segment. Copy the set that matches who you are writing to.";
}

export async function startTrack(
  productId: number,
  key: string,
  blueprint: Blueprint = LEGAL_INDIA_BLUEPRINT,
) {
  const template = getTemplate(key, blueprint);
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
      const agent = agentForStep(blueprint, template.key, i + 1);
      return {
        trackId: track.id,
        position: i + 1,
        title: s.title,
        why: s.why,
        instructions: agent ? agentInstructions(blueprint, agent) : s.instructions,
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
      agent: resolveStepAgent(t.key, s.position, s.agent, LEGAL_INDIA_BLUEPRINT),
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
