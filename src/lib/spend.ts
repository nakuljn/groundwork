import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activities, contacts } from "@/db/schema";
import { startOfMonth } from "date-fns";

export { formatChannelLabel, formatInr } from "./spend-format";

export type ChannelMetrics = {
  channel: string;
  spendInr: number;
  reachedOut: number;
  replies: number;
  meetings: number;
  signups: number;
  costPerReply: number | null;
  costPerMeeting: number | null;
  costPerSignup: number | null;
};

export async function getSpendSummary(productId: number) {
  const allActivities = await db
    .select()
    .from(activities)
    .where(eq(activities.productId, productId));

  const paid = allActivities
    .filter((a) => a.costInr > 0)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const monthStart = startOfMonth(new Date());

  return {
    monthTotal: paid
      .filter((a) => a.createdAt >= monthStart)
      .reduce((sum, a) => sum + a.costInr, 0),
    allTimeTotal: paid.reduce((sum, a) => sum + a.costInr, 0),
    paidActivities: paid,
    channelMetrics: await getChannelMetrics(productId),
  };
}

export async function getChannelMetrics(productId: number): Promise<ChannelMetrics[]> {
  const allContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.productId, productId));

  const allActivities = await db
    .select()
    .from(activities)
    .where(eq(activities.productId, productId));

  const channels = new Set<string>([
    ...allContacts.map((c) => c.sourceChannel),
    ...allActivities.map((a) => a.channel),
  ]);

  return Array.from(channels).map((channel) => {
    const spendInr = allActivities
      .filter((a) => a.channel === channel)
      .reduce((sum, a) => sum + a.costInr, 0);

    const reachedOut =
      allActivities
        .filter(
          (a) =>
            a.channel === channel &&
            ["linkedin_outreach", "cold_email", "post"].includes(a.type),
        )
        .reduce((sum, a) => sum + a.count, 0) +
      allContacts.filter(
        (c) => c.sourceChannel === channel && c.status !== "new",
      ).length;

    const replies = allContacts.filter(
      (c) =>
        c.sourceChannel === channel &&
        ["replied", "meeting", "won"].includes(c.status),
    ).length;

    const meetings = allContacts.filter(
      (c) => c.sourceChannel === channel && ["meeting", "won"].includes(c.status),
    ).length;

    const signups = allContacts.filter(
      (c) => c.sourceChannel === channel && c.status === "won",
    ).length;

    return {
      channel,
      spendInr,
      reachedOut,
      replies,
      meetings,
      signups,
      costPerReply: replies > 0 ? Math.round(spendInr / replies) : null,
      costPerMeeting: meetings > 0 ? Math.round(spendInr / meetings) : null,
      costPerSignup: signups > 0 ? Math.round(spendInr / signups) : null,
    };
  });
}
