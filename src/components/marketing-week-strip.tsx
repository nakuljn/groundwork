"use client";

import Link from "next/link";
import { format } from "date-fns";
import type { MarketingPost } from "@/types/domain";
import {
  formatPostTime,
  formatSlotDate,
  postRoleMeta,
  slotStatus,
  type WeekSlot,
} from "@/lib/marketing-shared";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  empty: "Empty",
  draft: "Draft",
  ready: "Ready",
  posted: "Posted",
  missed: "Missed",
  skipped: "Skipped",
};

export function MarketingWeekStrip({
  weekStart,
  slots,
  posts,
  postTime,
  productName,
  selectedPostId,
  onSelectPost,
}: {
  weekStart: Date;
  slots: WeekSlot[];
  posts: MarketingPost[];
  postTime: string;
  productName: string;
  selectedPostId?: number;
  onSelectPost: (postId: number | null, sequence: number) => void;
}) {
  const bySeq = new Map(posts.map((p) => [p.sequence, p]));

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          Week of {format(weekStart, "d MMM yyyy")} · {formatPostTime(postTime)}
        </p>
        <div className="flex gap-2 text-xs">
          <Link
            href={`/marketing?week=${format(weekStart, "yyyy-MM-dd")}`}
            className="text-muted-foreground underline hover:text-foreground"
          >
            This week
          </Link>
          <Link
            href={`/marketing?week=${format(new Date(weekStart.getTime() + 7 * 86400000), "yyyy-MM-dd")}`}
            className="text-muted-foreground underline hover:text-foreground"
          >
            Next week
          </Link>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {slots.map((slot) => {
          const post = bySeq.get(slot.sequence);
          const status = slotStatus(post, slot);
          const meta = postRoleMeta(slot.role, productName);
          const active = post && selectedPostId === post.id;

          return (
            <button
              key={slot.sequence}
              type="button"
              onClick={() => onSelectPost(post?.id ?? null, slot.sequence)}
              className={cn(
                "rounded-lg border px-4 py-3 text-left transition-colors",
                active ? "border-foreground bg-muted/60" : "hover:bg-muted/40",
                slot.timing === "today" && !active && "border-foreground/40",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{formatSlotDate(slot.date)}</span>
                <Badge
                  variant={
                    status === "posted"
                      ? "default"
                      : status === "missed"
                        ? "destructive"
                        : "outline"
                  }
                  className="text-[10px]"
                >
                  {STATUS_LABEL[status]}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{meta.eyebrow}</p>
              <p className="mt-0.5 text-sm font-medium leading-snug">
                {post?.hook ?? meta.label}
              </p>
              {slot.timing === "today" && (
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-foreground/70">
                  Today
                </p>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
