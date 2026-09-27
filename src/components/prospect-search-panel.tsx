"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { importSheetForDedup, runProspectAgent, saveAllNewProspects } from "@/app/actions";
import type { Contact, Product } from "@/types/domain";
import type { SearchGuide, Prospect } from "@/lib/prospect-types";
import { prospectDuplicateIndexes } from "@/lib/dedup";
import { ProspectTable } from "@/components/research-results";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBlueprint } from "@/components/blueprint-provider";
import { contactCategories } from "@/lib/categories";

export type ResearchData = {
  runId: number;
  target: string;
  location: string | null;
  error: string | null;
  sourceCount: number;
  guide: SearchGuide;
  prospects: Prospect[];
  added: number[];
};

export function ProspectSearchPanel({
  product,
  research,
  contacts,
  compact,
}: {
  product: Product;
  research: ResearchData | null;
  contacts: Contact[];
  compact?: boolean;
}) {
  const router = useRouter();
  const blueprint = useBlueprint();
  const categories = contactCategories(blueprint);
  const [pending, startTransition] = useTransition();
  const [sheetPending, startSheet] = useTransition();
  const [sheet, setSheet] = useState("");
  const [importCategory, setImportCategory] = useState(categories[0]?.key ?? "advocate");
  const [target, setTarget] = useState(research?.target ?? product.audience ?? "");
  const [location, setLocation] = useState(research?.location ?? "");

  const duplicates = useMemo(
    () => (research ? prospectDuplicateIndexes(research.prospects, contacts) : []),
    [research, contacts],
  );

  const newCount = research
    ? research.prospects.filter(
        (_, i) => !research.added.includes(i) && !duplicates.includes(i),
      ).length
    : 0;

  const runSearch = () => {
    startTransition(async () => {
      try {
        const result = await runProspectAgent({ target, location, count: 20 });
        router.refresh();
        if (result.error) toast.warning(result.error);
        else
          toast.success(
            `Found ${result.prospectCount} — ${result.newCount} new, ${result.duplicateCount} already on list`,
          );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Search failed");
      }
    });
  };

  const importSheet = () => {
    startSheet(async () => {
      try {
        const { imported, skipped } = await importSheetForDedup(sheet, importCategory);
        setSheet("");
        router.refresh();
        toast.success(`Imported ${imported}${skipped ? `, ${skipped} skipped as duplicates` : ""}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Import failed");
      }
    });
  };

  const saveAll = () => {
    if (!research) return;
    startTransition(async () => {
      try {
        const count = await saveAllNewProspects(research.runId);
        router.refresh();
        toast.success(`Saved ${count} to list`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save");
      }
    });
  };

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {!compact && (
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4" />
          Find more
        </div>
      )}

      <Button disabled={pending} onClick={runSearch}>
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Searching…
          </>
        ) : (
          "Find prospects"
        )}
      </Button>

      <details className="text-sm">
        <summary className="cursor-pointer text-foreground/70">Tweak search or import sheet</summary>
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Who to find"
            />
            <Input
              value={location ?? ""}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City or region"
            />
          </div>
          <Textarea
            value={sheet}
            onChange={(e) => setSheet(e.target.value)}
            rows={3}
            placeholder="Paste from your sheet — name, role, org, city, LinkedIn, email"
          />
          <div className="space-y-2">
            <Label htmlFor="sheetCategory">Import as</Label>
            <select
              id="sheetCategory"
              value={importCategory}
              onChange={(e) => setImportCategory(e.target.value)}
              className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Button variant="outline" size="sm" disabled={sheetPending || !sheet.trim()} onClick={importSheet}>
            {sheetPending ? "Importing…" : "Import rows"}
          </Button>
        </div>
      </details>

      {research && (
        <>
          {research.error && (
            <p className="rounded-lg border border-dashed p-3 text-sm text-foreground/80">
              {research.error}
            </p>
          )}

          {research.prospects.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  Latest search: {research.prospects.length} found · {newCount} new
                </p>
                {newCount > 0 && (
                  <Button size="sm" disabled={pending} onClick={saveAll}>
                    Save all {newCount} new
                  </Button>
                )}
              </div>
              <ProspectTable
                runId={research.runId}
                prospects={research.prospects}
                added={research.added}
                duplicateIndexes={duplicates}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
