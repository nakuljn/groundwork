import { z } from "zod";
import { generate } from "@/lib/ai";
import { blueprintSchema, type Blueprint } from "@/lib/blueprint/schema";
import { LEGAL_INDIA_BLUEPRINT } from "@/lib/blueprint/legal-india.fixture";
import type { OnboardingState } from "./state";

const partialBlueprintSchema = blueprintSchema.partial();

async function llmJson<T>(system: string, prompt: string, schema: z.ZodType<T>): Promise<T> {
  return generate({ system, prompt, schema, task: "writing", temperature: 0.4 });
}

export async function productAnalystNode(state: typeof OnboardingState.State) {
  const { input } = state;
  const productFacts = [
    `Product: ${input.productName}`,
    input.websiteUrl && `Website: ${input.websiteUrl}`,
    input.goals && `Goals: ${input.goals}`,
    input.rawContext && `Context:\n${input.rawContext}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    productFacts,
    artifacts: [
      ...(state.artifacts ?? []),
      { agent: "product_analyst", summary: "Extracted product facts", data: { productFacts } },
    ],
  };
}

export async function audienceStrategistNode(state: typeof OnboardingState.State) {
  const segments = await llmJson(
    "You design B2B audience segments for a founder GTM workspace. Return JSON only.",
    `Product facts:\n${state.productFacts}\n\nDesign 1 individual segment and 1 organization segment with roles (if B2B). Each role needs titlePatterns and a persona. Use messageGroupKey and contactCategory fields. Match the Blueprint segment schema shape.`,
    z.object({ segments: blueprintSchema.shape.segments }),
  );

  return {
    audienceDraft: segments.segments,
    artifacts: [
      ...(state.artifacts ?? []),
      {
        agent: "audience_strategist",
        summary: `Designed ${segments.segments.length} segments`,
        data: segments,
      },
    ],
  };
}

export async function marketResearchNode(state: typeof OnboardingState.State) {
  const prospecting = await llmJson(
    "You suggest prospect research sources and search hints for a product. Return JSON only.",
    `Product facts:\n${state.productFacts}\n\nReturn prospecting config: sources, searchHints, sizeEstimateExamples.`,
    z.object({
      sources: z.array(z.string()),
      searchHints: z.array(z.string()),
      sizeEstimateExamples: z.array(z.string()),
    }),
  );

  return {
    marketDraft: prospecting,
    artifacts: [
      ...(state.artifacts ?? []),
      { agent: "market_research", summary: "Suggested research sources", data: prospecting },
    ],
  };
}

export async function channelStrategistNode(state: typeof OnboardingState.State) {
  const tracks = await llmJson(
    "You design sales tracks for a founder workspace. Return JSON only.",
    `Product facts:\n${state.productFacts}\n\nReturn 3-4 tracks with skeleton steps and stepAgents for find_prospects / draft_messages where appropriate.`,
    z.object({ tracks: blueprintSchema.shape.tracks }),
  );

  return {
    tracksDraft: tracks.tracks,
    artifacts: [
      ...(state.artifacts ?? []),
      { agent: "channel_strategist", summary: `Planned ${tracks.tracks.length} tracks`, data: tracks },
    ],
  };
}

export async function contentStrategistNode(state: typeof OnboardingState.State) {
  const content = await llmJson(
    "You design LinkedIn content strategy for a B2B founder. Return JSON only.",
    `Product facts:\n${state.productFacts}\n\nReturn content config with voice, hashtags (max 3), audienceSummary, writingDomain, linkedinExampleShape.`,
    z.object({ content: blueprintSchema.shape.content }),
  );

  return {
    contentDraft: content.content,
    artifacts: [
      ...(state.artifacts ?? []),
      { agent: "content_strategist", summary: "Defined content strategy", data: content },
    ],
  };
}

export async function assemblerNode(state: typeof OnboardingState.State) {
  const draft: Blueprint = blueprintSchema.parse({
    ...LEGAL_INDIA_BLUEPRINT,
    id: `workspace-${state.input.workspaceId}`,
    version: 1,
    product: {
      ...LEGAL_INDIA_BLUEPRINT.product,
      name: state.input.productName,
      locale: LEGAL_INDIA_BLUEPRINT.product.locale,
    },
    segments: state.audienceDraft ?? LEGAL_INDIA_BLUEPRINT.segments,
    tracks: state.tracksDraft ?? LEGAL_INDIA_BLUEPRINT.tracks,
    content: { ...LEGAL_INDIA_BLUEPRINT.content, ...(state.contentDraft ?? {}) },
    prospecting: { ...LEGAL_INDIA_BLUEPRINT.prospecting, ...(state.marketDraft ?? {}) },
  });

  return { blueprint: draft };
}

export async function criticNode(state: typeof OnboardingState.State) {
  const blueprint = state.blueprint;
  if (!blueprint) return { issues: ["Blueprint missing"], status: "failed" as const };

  const issues: string[] = [];
  if (blueprint.segments.length < 2) issues.push("Need at least two audience segments.");
  if (blueprint.tracks.length < 2) issues.push("Need at least two tracks.");
  if (!blueprint.content.hashtags.length) issues.push("Content hashtags missing.");

  const banned = ["law firm", "advocate", "court", "legaltech"];
  const blob = JSON.stringify(blueprint).toLowerCase();
  const productBlob = state.productFacts.toLowerCase();
  const isLegal = productBlob.includes("legal") || productBlob.includes("law");
  if (!isLegal) {
    for (const term of banned) {
      if (blob.includes(term)) issues.push(`Remove legal-specific term "${term}" for this product.`);
    }
  }

  if (issues.length > 0) {
    return {
      issues,
      status: "failed" as const,
      criticRetries: (state.criticRetries ?? 0) + 1,
    };
  }

  return { issues: [], status: "review" as const };
}

export async function humanReviewNode(state: typeof OnboardingState.State) {
  return {
    status: "review" as const,
    blueprint: state.blueprint,
  };
}
