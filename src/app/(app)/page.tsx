import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { db } from "@/db";
import { activities } from "@/db/schema";
import { getActiveProduct } from "@/lib/product";
import { getProgressSummary } from "@/lib/progress";
import { getTodayActions } from "@/lib/today";
import { getMarketingReminder } from "@/lib/marketing";
import { formatChannelLabel } from "@/lib/spend";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { ProgressStrip } from "@/components/progress-strip";
import { MarketingReminder } from "@/components/marketing-reminder";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const activityLabel = (type: string) =>
  ACTIVITY_TYPES.find((t) => t.value === type)?.label ?? type;

export default async function DashboardPage() {
  const product = await getActiveProduct();

  if (!product) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Dashboard"
          description="Tells you what to do next for sales and marketing."
          nextAction="Set up your product in Settings."
        />
        <Link href="/settings" className={cn(buttonVariants())}>
          Go to Settings
        </Link>
      </div>
    );
  }

  const [todayActions, recent, progress, marketingReminder] = await Promise.all([
    getTodayActions(product.id),
    db
      .select()
      .from(activities)
      .where(eq(activities.productId, product.id))
      .orderBy(desc(activities.createdAt))
      .limit(5),
    getProgressSummary(product.id),
    getMarketingReminder(product.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Do these in order. Each one is a single next step — no guessing."
        nextAction={todayActions[0]?.label}
      />

      {marketingReminder.due && <MarketingReminder counts={marketingReminder.counts} />}

      <Card>
        <CardHeader>
          <CardTitle>Your queue</CardTitle>
          <CardDescription>One action at a time.</CardDescription>
        </CardHeader>
        <CardContent>
          {todayActions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing queued.{" "}
              <Link href="/plan" className="underline">
                Start a sales track
              </Link>{" "}
              or{" "}
              <Link href="/marketing" className="underline">
                plan LinkedIn posts
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y">
              {todayActions.map((action) => (
                <li key={action.id} className="flex items-center justify-between gap-4 py-3">
                  <p className="text-sm font-medium leading-snug">{action.label}</p>
                  <Link
                    href={action.href}
                    className={cn(buttonVariants({ size: "sm", variant: "outline" }), "shrink-0")}
                  >
                    {action.button}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ProgressStrip data={progress} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent activity</CardTitle>
          <Link href="/activity" className="text-sm text-muted-foreground hover:text-foreground">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
          ) : (
            <ul className="divide-y">
              {recent.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {activityLabel(a.type)}
                      {a.count > 1 && ` ×${a.count}`}
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {formatChannelLabel(a.channel)}
                      </span>
                    </p>
                    {a.note && (
                      <p className="truncate text-sm text-muted-foreground">{a.note}</p>
                    )}
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {format(a.createdAt, "MMM d")}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
