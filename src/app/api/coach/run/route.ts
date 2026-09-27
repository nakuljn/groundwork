import { NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { activities, contacts, products } from "@/db/schema";
import { runCoachAgent } from "@/lib/agents/coach/graph";
import { getWorkspaceBlueprint } from "@/lib/blueprint/service";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { workspaceId?: number; productId?: number };
    if (!body.workspaceId) {
      return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
    }

    const blueprint = await getWorkspaceBlueprint(body.workspaceId);
    const [product] = body.productId
      ? await db.select().from(products).where(eq(products.id, body.productId)).limit(1)
      : await db
          .select()
          .from(products)
          .where(eq(products.workspaceId, body.workspaceId))
          .limit(1);

    if (!product) {
      return NextResponse.json({ error: "No product in workspace" }, { status: 400 });
    }

    const [{ value: contactCount }] = await db
      .select({ value: count() })
      .from(contacts)
      .where(eq(contacts.productId, product.id));

    const [{ value: activityCount }] = await db
      .select({ value: count() })
      .from(activities)
      .where(eq(activities.productId, product.id));

    const allContacts = await db
      .select()
      .from(contacts)
      .where(eq(contacts.productId, product.id));

    const reached = allContacts.filter((c) => c.status !== "new").length;
    const replies = allContacts.filter((c) =>
      ["replied", "meeting", "won"].includes(c.status),
    ).length;

    const coach = await runCoachAgent({
      blueprint,
      metrics: {
        contacts: contactCount,
        activities: activityCount,
        replyRate: reached > 0 ? replies / reached : undefined,
      },
    });

    return NextResponse.json(coach);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Coach failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
