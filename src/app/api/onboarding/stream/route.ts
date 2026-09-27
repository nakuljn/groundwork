import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agentRuns } from "@/db/schema";
import { streamOnboardingGraph } from "@/lib/agents/onboarding/graph";
import type { Blueprint } from "@/lib/blueprint/schema";
import { saveDraftBlueprint } from "@/lib/blueprint/service";

export const runtime = "nodejs";
export const maxDuration = 300;

type StreamState = {
  blueprint?: Blueprint;
  artifacts?: Array<{ agent: string; summary: string }>;
  issues?: string[];
  status?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as {
    workspaceId?: number;
    productName?: string;
    websiteUrl?: string;
    goals?: string;
    rawContext?: string;
  };

  if (!body.workspaceId || !body.productName?.trim()) {
    return new Response(JSON.stringify({ error: "workspaceId and productName required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const threadId = randomUUID();
  const [run] = await db
    .insert(agentRuns)
    .values({
      workspaceId: body.workspaceId,
      graph: "onboarding",
      threadId,
      status: "running",
      inputJson: JSON.stringify(body),
    })
    .returning();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const finalState: StreamState = {};

      try {
        for await (const update of streamOnboardingGraph(
          {
            workspaceId: body.workspaceId!,
            productName: body.productName!.trim(),
            websiteUrl: body.websiteUrl,
            goals: body.goals,
            rawContext: body.rawContext,
          },
          threadId,
        )) {
          send("update", update);
          for (const nodeUpdate of Object.values(update)) {
            Object.assign(finalState, nodeUpdate);
          }
        }

        if (finalState.blueprint) {
          await saveDraftBlueprint(body.workspaceId!, finalState.blueprint, run.id);
        }

        await db
          .update(agentRuns)
          .set({
            status: finalState.status === "failed" ? "failed" : "completed",
            outputJson: JSON.stringify(finalState),
            completedAt: new Date(),
          })
          .where(eq(agentRuns.id, run.id));

        send("done", { runId: run.id, threadId, ...finalState });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Onboarding failed";
        await db
          .update(agentRuns)
          .set({ status: "failed", error: message, completedAt: new Date() })
          .where(eq(agentRuns.id, run.id));
        send("error", { error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
