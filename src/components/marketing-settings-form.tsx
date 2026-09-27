"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { saveMarketingSettingsAction } from "@/app/actions";
import type { MarketingSettings } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const DAYS = [
  [1, "Monday"],
  [2, "Tuesday"],
  [3, "Wednesday"],
  [4, "Thursday"],
  [5, "Friday"],
  [6, "Saturday"],
  [7, "Sunday"],
] as const;

export function MarketingSettingsForm({ settings }: { settings: MarketingSettings }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-5"
      action={(formData) =>
        startTransition(async () => {
          try {
            await saveMarketingSettingsAction(formData);
            toast.success("Marketing settings saved");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not save settings");
          }
        })
      }
    >
      <label className="flex items-start gap-3 rounded-lg border px-4 py-3">
        <input
          type="checkbox"
          name="reminderEnabled"
          defaultChecked={settings.reminderEnabled}
          className="mt-1 h-4 w-4"
        />
        <span>
          <span className="block text-sm font-medium">Weekly reminder on Dashboard</span>
          <span className="block text-xs text-muted-foreground">
            Nudge you when this week&apos;s posts are not finished.
          </span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reminderDay">Reminder day</Label>
          <select
            id="reminderDay"
            name="reminderDay"
            defaultValue={settings.reminderDay}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {DAYS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input id="timezone" name="timezone" defaultValue={settings.timezone} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="voiceGuidance">LinkedIn Page voice</Label>
        <Textarea
          id="voiceGuidance"
          name="voiceGuidance"
          rows={4}
          defaultValue={settings.voiceGuidance ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pastPosts">Past posts (optional)</Label>
        <Textarea
          id="pastPosts"
          name="pastPosts"
          rows={6}
          defaultValue={settings.pastPosts ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="imageStyle">Image style</Label>
        <Textarea
          id="imageStyle"
          name="imageStyle"
          rows={3}
          defaultValue={settings.imageStyle ?? ""}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Posts per week and posting days are set on the LinkedIn posts page.
      </p>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save marketing settings"}
      </Button>
    </form>
  );
}
