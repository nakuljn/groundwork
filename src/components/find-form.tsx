"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { findProspects } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FindForm({
  defaultTarget,
  defaultLocation,
}: {
  defaultTarget: string;
  defaultLocation: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4 md:grid-cols-[2fr_1.2fr_100px_auto] md:items-end"
      action={(formData) => {
        startTransition(async () => {
          try {
            const { prospectCount, error } = await findProspects(formData);
            router.refresh();
            if (error) toast.warning(error);
            else toast.success(`Found ${prospectCount} prospects`);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Research failed");
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="target">Who do you want to reach?</Label>
        <Input
          id="target"
          name="target"
          defaultValue={defaultTarget}
          placeholder="Solo advocates and small law firms doing litigation"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Where?</Label>
        <Input
          id="location"
          name="location"
          defaultValue={defaultLocation}
          placeholder="Jaipur, Gwalior, Indore"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="count">How many</Label>
        <Input id="count" name="count" type="number" min={1} max={25} defaultValue={10} />
      </div>
      <Button type="submit" disabled={pending} className="h-9">
        <Search className="mr-1.5 h-4 w-4" />
        {pending ? "Researching… (up to a minute)" : "Find prospects"}
      </Button>
    </form>
  );
}
