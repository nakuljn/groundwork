import { NextResponse } from "next/server";
import { publishBlueprint } from "@/lib/blueprint/service";
import { blueprintSchema } from "@/lib/blueprint/schema";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { workspaceId?: number; blueprint?: unknown };
    if (!body.workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }
    const blueprint = blueprintSchema.parse(body.blueprint);
    const row = await publishBlueprint(body.workspaceId, blueprint);
    return NextResponse.json({ id: row.id, version: row.version });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publish failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
