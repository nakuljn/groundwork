import { desc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/db";
import { activities } from "@/db/schema";
import { getActiveProduct } from "@/lib/product";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { formatChannelLabel, formatInr } from "@/lib/spend";
import { ActivityQuickAddForm } from "@/components/activity-quick-add-form";
import { ProgressUpdateForm } from "@/components/progress-update-form";
import { DeleteActivityButton } from "@/components/delete-activity-button";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const activityLabel = (type: string) =>
  ACTIVITY_TYPES.find((t) => t.value === type)?.label ?? type;

export default async function ActivityPage() {
  const product = await getActiveProduct();

  if (!product) {
    return (
      <PageHeader
        title="Activity"
        description="Log outreach, posts, calls and spend."
        nextAction="Set up your product in Settings."
      />
    );
  }

  const rows = await db
    .select()
    .from(activities)
    .where(eq(activities.productId, product.id))
    .orderBy(desc(activities.createdAt));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity"
        description="Log everything you did — outreach, posts, calls, and anything you paid for."
        nextAction="Type what you did in plain English, or fill in the form."
      />

      <Card>
        <CardHeader>
          <CardTitle>Log</CardTitle>
          <CardDescription>Describe it in plain English, including any money spent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProgressUpdateForm />
          <details className="group rounded-lg border px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">
              Or fill in the details yourself
            </summary>
            <div className="pt-4">
              <ActivityQuickAddForm />
            </div>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="divide-y">
              {rows.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {activityLabel(row.type)}
                      {row.count > 1 && ` ×${row.count}`}
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {formatChannelLabel(row.channel)}
                      </span>
                      {row.costInr > 0 && (
                        <span className="ml-2 rounded border px-1.5 py-0.5 text-xs font-medium tabular-nums">
                          {formatInr(row.costInr)}
                        </span>
                      )}
                    </p>
                    {row.note && <p className="mt-0.5 text-sm">{row.note}</p>}
                    {row.outcome && (
                      <p className="mt-0.5 text-sm text-muted-foreground">Outcome: {row.outcome}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <time className="text-xs text-muted-foreground">
                      {format(row.createdAt, "MMM d, yyyy")}
                    </time>
                    <DeleteActivityButton activityId={row.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
