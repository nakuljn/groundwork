"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { Product } from "@/types/domain";
import { saveSenderProfile } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SenderProfileForm({ product }: { product: Product | null }) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      action={(formData) => {
        startTransition(async () => {
          try {
            await saveSenderProfile(formData);
            toast.success("Profile saved");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not save");
          }
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="senderName">Your name</Label>
        <Input
          id="senderName"
          name="senderName"
          defaultValue={product?.senderName ?? ""}
          placeholder="Nakul Jain"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="senderTitle">Position</Label>
        <Input
          id="senderTitle"
          name="senderTitle"
          defaultValue={product?.senderTitle ?? ""}
          placeholder="Founder, Knowlex"
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="senderContact">Contact information</Label>
        <Textarea
          id="senderContact"
          name="senderContact"
          rows={3}
          defaultValue={product?.senderContact ?? ""}
          placeholder={"nakul@knowlex.ai\n+91 98765 43210\nlinkedin.com/in/you"}
        />
        <p className="text-xs text-foreground/60">
          Goes at the bottom of cold emails and follow-ups. Fill this before drafting messages.
        </p>
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending || !product}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}
