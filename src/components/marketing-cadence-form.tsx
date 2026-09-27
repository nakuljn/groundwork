"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateMarketingCadenceAction } from "@/app/actions";
import type { MarketingSettings } from "@/types/domain";
import { defaultPostingDays, parsePostingDays } from "@/lib/marketing-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MarketingCadenceForm({ settings }: { settings: MarketingSettings }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [weeklyTarget, setWeeklyTarget] = useState(settings.weeklyTarget);
  const [postTime, setPostTime] = useState(settings.postTime);
  const [postingDays, setPostingDays] = useState<number[]>(
    parsePostingDays(settings.postingDays, settings.weeklyTarget),
  );

  const setTarget = (n: number) => {
    setWeeklyTarget(n);
    setPostingDays(defaultPostingDays(n));
  };

  const toggleDay = (day: number) => {
    setPostingDays((current) => {
      const has = current.includes(day);
      if (has && current.length <= 1) return current;
      return has ? current.filter((d) => d !== day) : [...current, day].sort((a, b) => a - b);
    });
  };

  const save = () =>
    startTransition(async () => {
      try {
        await updateMarketingCadenceAction({ weeklyTarget, postingDays, postTime });
        router.refresh();
        toast.success("Posting schedule saved");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save");
      }
    });

  return (
    <div className="space-y-4 rounded-lg border px-4 py-4">
      <div>
        <p className="text-sm font-medium">Posts per week</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setTarget(n)}
              className={cn(
                "rounded-md border px-3 py-1 text-sm transition-colors",
                weeklyTarget === n
                  ? "border-foreground bg-muted font-medium"
                  : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">Posting days</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {DAY_LABELS.map((label, i) => {
            const day = i + 1;
            const on = postingDays.includes(day);
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggleDay(day)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs transition-colors",
                  on
                    ? "border-foreground bg-muted font-medium"
                    : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="postTime" className="text-sm font-medium">
            Post time
          </label>
          <Input
            id="postTime"
            type="time"
            value={postTime}
            onChange={(e) => setPostTime(e.target.value)}
            className="h-9 w-36"
          />
        </div>
        <Button size="sm" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save schedule"}
        </Button>
      </div>
    </div>
  );
}
