"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { importContacts } from "@/app/actions";
import { useBlueprint } from "@/components/blueprint-provider";
import { contactCategories } from "@/lib/categories";
import { CHANNELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ImportContactsForm() {
  const blueprint = useBlueprint();
  const categories = contactCategories(blueprint);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      action={(formData) => {
        startTransition(async () => {
          try {
            const count = await importContacts(formData);
            toast.success(`Imported ${count} contacts`);
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Import failed",
            );
          }
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            name="category"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            defaultValue={categories[0]?.key ?? "advocate"}
          >
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sourceChannel">Source channel</Label>
          <select
            id="sourceChannel"
            name="sourceChannel"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            defaultValue="linkedin"
          >
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Textarea
        name="contacts"
        rows={8}
        placeholder={`Adv. Rajesh Sharma, Advocate, Gwalior HC, Gwalior, https://linkedin.com/in/..., , MP bench\nAdv. Priya Mehta, Lawyer, Jaipur District Court, Jaipur, , priya@example.com`}
        required
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Importing..." : "Import contacts"}
      </Button>
    </form>
  );
}
