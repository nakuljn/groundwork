import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activities, contacts } from "@/db/schema";
import { subDays } from "date-fns";
import { getSpendSummary } from "./spend";

export async function getProgressSummary(productId: number) {
  const since7 = subDays(new Date(), 7);
  const since30 = subDays(new Date(), 30);

  const allActivities = await db
    .select()
    .from(activities)
    .where(eq(activities.productId, productId));

  const allContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.productId, productId));

  const countInWindow = (
    items: typeof allActivities,
    since: Date,
    types?: string[],
  ) =>
    items
      .filter((a) => a.createdAt >= since && (!types || types.includes(a.type)))
      .reduce((sum, a) => sum + a.count, 0);

  const contactCount = (statuses: string[], since?: Date) =>
    allContacts.filter(
      (c) =>
        statuses.includes(c.status) &&
        (!since || (c.lastContactedAt && c.lastContactedAt >= since)),
    ).length;

  const spend = await getSpendSummary(productId);

  return {
    last7: {
      reachedOut: countInWindow(allActivities, since7, [
        "linkedin_outreach",
        "cold_email",
        "post",
      ]),
      replies: contactCount(["replied", "meeting", "won"], since7),
      meetings: contactCount(["meeting", "won"], since7),
      signups: contactCount(["won"], since7),
    },
    last30: {
      reachedOut: countInWindow(allActivities, since30, [
        "linkedin_outreach",
        "cold_email",
        "post",
      ]),
      replies: contactCount(["replied", "meeting", "won"], since30),
      meetings: contactCount(["meeting", "won"], since30),
      signups: contactCount(["won"], since30),
    },
    monthSpend: spend.monthTotal,
    totalContacts: allContacts.length,
    pendingFollowUps: allContacts.filter(
      (c) =>
        c.status === "contacted" &&
        c.lastContactedAt &&
        c.lastContactedAt <= subDays(new Date(), 3),
    ).length,
  };
}
