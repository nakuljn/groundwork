import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agentRuns } from "@/db/schema";
import { runOnboardingGraph } from "@/lib/agents/onboarding/graph";
import { saveDraftBlueprint } from "@/lib/blueprint/service";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      workspaceId?: number;
      productName?: string;
      websiteUrl?: string;
      repoPath?: string;
      goals?: string;
      rawContext?: string;
    };

    if (!body.workspaceId || !body.productName?.trim()) {
      return NextResponse.json({ error: "workspaceId and productName required" }, { status: 400 });
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

    const result = await runOnboardingGraph({
      workspaceId: body.workspaceId,
      productName: body.productName.trim(),
      websiteUrl: body.websiteUrl,
      repoPath: body.repoPath,
      goals: body.goals,
      rawContext: body.rawContext,
    });

    if (result.blueprint) {
      await saveDraftBlueprint(body.workspaceId, result.blueprint, run.id);
    }

    await db
      .update(agentRuns)
      .set({
        status: result.status === "failed" ? "failed" : "completed",
        outputJson: JSON.stringify({ blueprint: result.blueprint, issues: result.issues, artifacts: result.artifacts }),
        completedAt: new Date(),
      })
      .where(eq(agentRuns.id, run.id));

    return NextResponse.json({
      runId: run.id,
      threadId,
      status: result.status,
      blueprint: result.blueprint,
      issues: result.issues,
      artifacts: result.artifacts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onboarding failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
