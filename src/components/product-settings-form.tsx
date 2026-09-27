"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import type { Product } from "@/types/domain";
import { saveProduct, understandProduct } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProductSettingsForm({ product }: { product: Product | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [understanding, startUnderstand] = useTransition();

  const handleUnderstand = () => {
    startUnderstand(async () => {
      try {
        if (formRef.current) {
          await saveProduct(new FormData(formRef.current));
        }
        const brief = await understandProduct();
        const briefField = formRef.current?.elements.namedItem(
          "brief",
        ) as HTMLTextAreaElement | null;
        if (briefField) briefField.value = brief;
        toast.success("Product brief updated");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not understand product",
        );
      }
    });
  };

  return (
    <form
      ref={formRef}
      id="product-form"
      className="grid gap-4 md:grid-cols-2"
      action={(formData) => {
        startTransition(async () => {
          try {
            await saveProduct(formData);
            toast.success("Product saved");
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Could not save",
            );
          }
        });
      }}
    >
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="name">Product name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={product?.name ?? ""}
          required
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="oneLiner">One-liner</Label>
        <Input
          id="oneLiner"
          name="oneLiner"
          defaultValue={product?.oneLiner ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="audience">Target audience</Label>
        <Input
          id="audience"
          name="audience"
          defaultValue={product?.audience ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="goal">Current goal</Label>
        <Input
          id="goal"
          name="goal"
          defaultValue={product?.goal ?? ""}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="offer">Offer / hook</Label>
        <Input
          id="offer"
          name="offer"
          defaultValue={product?.offer ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="websiteUrl">Website URL</Label>
        <Input
          id="websiteUrl"
          name="websiteUrl"
          defaultValue={product?.websiteUrl ?? ""}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="repoPath">Local folder path (optional)</Label>
        <Input
          id="repoPath"
          name="repoPath"
          defaultValue={product?.repoPath ?? ""}
        />
        <p className="text-xs text-muted-foreground">
          Can be a single repo or a workspace folder with multiple repos inside.
          Groundwork will read README files from each project.
        </p>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="brief">Product brief</Label>
        <Textarea
          id="brief"
          name="brief"
          rows={10}
          defaultValue={product?.brief ?? ""}
        />
      </div>
      <div className="flex flex-wrap gap-3 md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save product"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={understanding}
          onClick={handleUnderstand}
        >
          {understanding ? "Reading..." : "Understand my product"}
        </Button>
      </div>
    </form>
  );
}
