"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addActivity } from "@/app/actions";
import { ACTIVITY_TYPES, CHANNELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

export function ActivityQuickAddForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      action={(formData) => {
        startTransition(async () => {
          try {
            await addActivity(formData);
            formRef.current?.reset();
            router.refresh();
            toast.success("Logged");
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Could not log activity",
            );
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="type">What</Label>
        <select id="type" name="type" className={selectClass} defaultValue="linkedin_outreach">
          {ACTIVITY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="channel">Channel</Label>
        <select id="channel" name="channel" className={selectClass} defaultValue="linkedin">
          {CHANNELS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="count">How many</Label>
        <Input id="count" name="count" type="number" min={1} defaultValue={1} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="costInr">Cost (₹, optional)</Label>
        <Input id="costInr" name="costInr" type="number" min={0} placeholder="0" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="note">Note</Label>
        <Input id="note" name="note" placeholder="Sales Navigator monthly, or 15 requests to Jaipur advocates" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="outcome">Outcome (optional)</Label>
        <Input id="outcome" name="outcome" placeholder="2 replies" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" />
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Log activity"}
        </Button>
      </div>
    </form>
  );
}
