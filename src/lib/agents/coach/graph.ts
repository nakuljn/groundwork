import { z } from "zod";
import { generate } from "@/lib/ai";
import { blueprintSchema, type Blueprint } from "@/lib/blueprint/schema";

const coachSchema = z.object({
  summary: z.string(),
  suggestions: z.array(
    z.object({
      path: z.string(),
      reason: z.string(),
      proposed: z.unknown(),
    }),
  ),
});

export async function runCoachAgent(input: {
  blueprint: Blueprint;
  metrics: {
    contacts: number;
    activities: number;
    replyRate?: number;
    acceptanceRate?: number;
  };
}) {
  return generate({
    system:
      "You are a weekly GTM coach for a founder. Propose small blueprint diffs based on metrics. Never invent product facts.",
    prompt: `Current blueprint:
${JSON.stringify(input.blueprint, null, 2)}

Metrics:
${JSON.stringify(input.metrics, null, 2)}

Return JSON with summary and suggestions array. Each suggestion has JSON path, reason, and proposed value.`,
    schema: coachSchema,
    task: "writing",
    temperature: 0.3,
  });
}

export function applyCoachSuggestion(blueprint: Blueprint, path: string, proposed: unknown): Blueprint {
  const clone = structuredClone(blueprint) as Record<string, unknown>;
  const parts = path.split(".");
  let cursor: Record<string, unknown> = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    cursor = cursor[parts[i]!] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]!] = proposed;
  return blueprintSchema.parse(clone);
}
