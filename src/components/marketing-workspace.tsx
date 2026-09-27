"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  createManualMarketingPostAction,
  generateMarketingWeekAction,
} from "@/app/actions";
import type {
  ContentWeekWithPosts,
  MarketingSettings,
  Product,
} from "@/types/domain";
import {
  formatPostTime,
  formatSlotDate,
  nextPostSlot,
  type WeekSlot,
} from "@/lib/marketing-shared";
import { MarketingCadenceForm } from "@/components/marketing-cadence-form";
import { MarketingWeekStrip } from "@/components/marketing-week-strip";
import { MarketingPostEditor } from "@/components/marketing-post-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MarketingWorkspace({
  product,
  settings,
  week,
  slots,
  postingDays,
  today,
}: {
  product: Product;
  settings: MarketingSettings;
  week: ContentWeekWithPosts;
  slots: WeekSlot[];
  postingDays: number[];
  today: Date;
}) {
  const router = useRouter();
  const [topic, setTopic] = useState(week.topic ?? "");
  const [pending, startTransition] = useTransition();
  const [selectedPostId, setSelectedPostId] = useState<number | undefined>(
    week.posts[0]?.id,
  );

  const nextSlot = useMemo(
    () => nextPostSlot(week.weekStart, postingDays, settings.timezone, today),
    [week.weekStart, postingDays, settings.timezone, today],
  );

  const selectedPost = week.posts.find((p) => p.id === selectedPostId);

  const run = (fn: () => Promise<unknown>, success: string) =>
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
        toast.success(success);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      }
    });

  const planWeek = () =>
    run(
      () => generateMarketingWeekAction(topic, format(week.weekStart, "yyyy-MM-dd")),
      "Week planned",
    );

  const selectPost = async (postId: number | null, _sequence: number) => {
    if (postId) {
      setSelectedPostId(postId);
      return;
    }
    startTransition(async () => {
      try {
        const id = await createManualMarketingPostAction(week.id);
        setSelectedPostId(id);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create post");
      }
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Today is {format(today, "EEEE, d MMM")}.
        {nextSlot ? (
          <>
            {" "}
            Next post: {formatSlotDate(nextSlot.date)}, {formatPostTime(settings.postTime)}.
          </>
        ) : (
          <> This week is complete.</>
        )}
      </p>

      <MarketingCadenceForm settings={settings} />

      <MarketingWeekStrip
        weekStart={week.weekStart}
        slots={slots}
        posts={week.posts}
        postTime={settings.postTime}
        productName={product.name}
        selectedPostId={selectedPostId}
        onSelectPost={selectPost}
      />

      <section className="space-y-3 rounded-lg border px-4 py-4">
        <div>
          <p className="text-sm font-medium">Plan this week</p>
          <p className="text-sm text-muted-foreground">
            Leave blank and Groundwork picks a topic from your brief. Only empty slots are filled.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            aria-label="Topic for this week (optional)"
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && !pending && planWeek()}
          />
          <Button disabled={pending} onClick={planWeek}>
            <Sparkles className="mr-1.5 h-4 w-4" />
            {pending ? "Planning…" : "Plan this week"}
          </Button>
        </div>
        {week.storyline && (
          <p className="border-l-2 pl-3 text-sm leading-relaxed text-muted-foreground">
            {week.storyline}
          </p>
        )}
      </section>

      {selectedPost ? (
        <MarketingPostEditor key={`${selectedPost.id}:${selectedPost.updatedAt.toISOString()}`} post={selectedPost} product={product} />
      ) : (
        <p className="text-sm text-muted-foreground">Select a day above to write or edit a post.</p>
      )}
    </div>
  );
}
