import type { Blueprint } from "@/lib/blueprint/schema";
import { runProspectResearch } from "@/lib/prospect-research";
import { generateCategoryMessages } from "@/lib/writing";
import { generateMarketingWeek } from "@/lib/marketing";
import { inngest } from "@/lib/inngest/client";
import { recordUsageEvent } from "@/lib/billing/stripe";

export type RuntimeAgent = "prospect_research" | "outreach_writer" | "content_planner";

export async function runRuntimeAgent(
  agent: RuntimeAgent,
  input: Record<string, unknown>,
  blueprint: Blueprint,
) {
  const workspaceId = input.workspaceId as number | undefined;

  try {
    switch (agent) {
      case "prospect_research":
        return runProspectResearch({
          productId: input.productId as number,
          target: input.target as string,
          location: (input.location as string) ?? "",
          count: (input.count as number) ?? 20,
          blueprint,
        });
      case "outreach_writer":
        return generateCategoryMessages(input.categoryId as number);
      case "content_planner":
        return generateMarketingWeek(input.productId as number, input.topic as string | undefined);
      default:
        throw new Error(`Unknown runtime agent: ${agent}`);
    }
  } finally {
    if (workspaceId) {
      await recordUsageEvent({ workspaceId, kind: `agent:${agent}`, units: 1 });
    }
  }
}

export async function enqueueRuntimeAgent(
  agent: RuntimeAgent,
  input: Record<string, unknown> & { workspaceId: number },
) {
  if (process.env.INNGEST_EVENT_KEY || process.env.INNGEST_DEV) {
    await inngest.send({
      name: "groundwork/runtime-agent.run",
      data: { agent, input, workspaceId: input.workspaceId },
    });
    return { queued: true };
  }
  const { getActiveWorkspaceBlueprint } = await import("@/lib/blueprint/service");
  const { blueprint } = await getActiveWorkspaceBlueprint(input.workspaceId);
  const result = await runRuntimeAgent(agent, input, blueprint);
  return { queued: false, result };
}
