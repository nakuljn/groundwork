"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import { dismissMarketingReminderAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function MarketingReminder({
  counts,
}: {
  counts: { total: number; draft: number; ready: number; posted: number };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const target = counts.total || 1;
  const remaining = Math.max(0, target - counts.posted);

  return (
    <section className="relative overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            LinkedIn this week
          </p>
          <p className="mt-1 text-sm font-semibold">
            {counts.total === 0
              ? "Plan your posts for this week"
              : `${remaining} post${remaining === 1 ? "" : "s"} left to publish`}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {counts.ready} ready · {counts.posted} posted
          </p>
        </div>
        <Link
          href="/marketing"
          className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted"
        >
          Open planner
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Link>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-1 top-1 h-8 w-8 p-0"
        aria-label="Dismiss reminder"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await dismissMarketingReminderAction();
            router.refresh();
          })
        }
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </section>
  );
}
