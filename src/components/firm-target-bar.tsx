"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { applyTargetFirmNameAction } from "@/app/actions";
import {
  LAST_APPLIED_FIRM_STORAGE_KEY,
  TARGET_FIRM_STORAGE_KEY,
  TARGET_NAME_STORAGE_KEY,
} from "@/lib/firm-name";
import type { Blueprint } from "@/lib/blueprint/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FirmTargetBar({
  productId,
  blueprint,
  onPreviewChange,
}: {
  productId: number;
  blueprint: Blueprint;
  onPreviewChange: (preview: { name: string; firm: string }) => void;
}) {
  const org = blueprint.vocabulary.org;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [firm, setFirm] = useState("");
  const [lastApplied, setLastApplied] = useState("");

  useEffect(() => {
    setName(localStorage.getItem(TARGET_NAME_STORAGE_KEY) ?? "");
    setFirm(localStorage.getItem(TARGET_FIRM_STORAGE_KEY) ?? "");
    setLastApplied(localStorage.getItem(LAST_APPLIED_FIRM_STORAGE_KEY) ?? "");
  }, []);

  useEffect(() => {
    onPreviewChange({ name, firm });
  }, [name, firm, onPreviewChange]);

  const persistPreview = (nextName: string, nextFirm: string) => {
    localStorage.setItem(TARGET_NAME_STORAGE_KEY, nextName);
    localStorage.setItem(TARGET_FIRM_STORAGE_KEY, nextFirm);
  };

  const applyFirm = () => {
    const trimmed = firm.trim();
    if (!trimmed) {
      toast.error(`Enter the ${org} name first`);
      return;
    }

    startTransition(async () => {
      try {
        const previous = lastApplied.trim() || undefined;
        await applyTargetFirmNameAction(productId, trimmed, previous);
        localStorage.setItem(LAST_APPLIED_FIRM_STORAGE_KEY, trimmed);
        persistPreview(name, trimmed);
        setLastApplied(trimmed);
        router.refresh();
        toast.success(`Updated all ${org} messages for ${trimmed}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update messages");
      }
    });
  };

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div>
        <h3 className="text-sm font-medium">{blueprint.vocabulary.targetOrgBarTitle}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Set the {org} once here. Apply updates every role message. Use the name field to preview{" "}
          {"{name}"} when copying.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Preview name (fills {"{name}"})</Label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                persistPreview(e.target.value, firm);
              }}
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            {org.charAt(0).toUpperCase()}
            {org.slice(1)} name (fills {"{org}"})
          </Label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={firm}
              onChange={(e) => {
                setFirm(e.target.value);
                persistPreview(name, e.target.value);
              }}
              onKeyDown={(e) => e.key === "Enter" && applyFirm()}
              className="h-9 pl-8 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={pending || !firm.trim()} onClick={applyFirm}>
          {pending ? "Updating…" : `Apply ${org} name to all messages`}
        </Button>
        {lastApplied && (
          <span className="text-xs text-muted-foreground">
            Last applied: {lastApplied}
          </span>
        )}
      </div>
    </div>
  );
}
