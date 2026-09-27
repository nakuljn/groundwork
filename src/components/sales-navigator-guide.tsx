"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import type { Blueprint } from "@/lib/blueprint/schema";
import { navigatorGuide } from "@/lib/blueprint/helpers";
import { MESSAGE_BY_DEGREE, NAVIGATOR_ROUTINE } from "@/lib/sales-navigator";
import { Button } from "@/components/ui/button";

export function SalesNavigatorGuide({
  categoryKey,
  blueprint,
}: {
  categoryKey: string;
  blueprint: Blueprint;
}) {
  const guide = navigatorGuide(blueprint, categoryKey);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  return (
    <div className="space-y-6 text-sm">
      <section className="space-y-3">
        <p className="text-foreground/70">
          In Sales Navigator, open <span className="font-medium text-foreground">Lead filters</span>{" "}
          (people search, not Account search) and set these. Filter names are as Sales Navigator shows
          them; LinkedIn sometimes moves them between panel sections.
        </p>
        <ol className="divide-y rounded-lg border">
          {guide.filters.map((f, i) => (
            <li key={f.filter} className="grid gap-1 px-4 py-3 sm:grid-cols-[1.5rem_10rem_1fr]">
              <span className="text-foreground/50 tabular-nums">{i + 1}</span>
              <span className="font-medium">{f.filter}</span>
              <div>
                <p>{f.select}</p>
                <p className="text-xs text-foreground/60">{f.why}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {guide.titleBoolean && (
        <section className="space-y-2">
          <p className="font-medium">Current job title search</p>
          <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3">
            <code className="flex-1 break-words font-mono text-xs">{guide.titleBoolean}</code>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => copy(guide.titleBoolean)}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-xs text-foreground/60">
            Paste into the Current job title filter. Keep OR and NOT in capitals and the quotes around
            multi-word titles.
          </p>
        </section>
      )}

      <section className="space-y-2">
        <p className="font-medium">Which message to send</p>
        <ul className="divide-y rounded-lg border">
          {MESSAGE_BY_DEGREE.map((m) => (
            <li key={m.degree} className="grid gap-1 px-4 py-3 sm:grid-cols-[12rem_1fr]">
              <span className="font-medium">{m.degree}</span>
              <div>
                <p>{m.use}</p>
                <p className="text-xs text-foreground/60">{m.note}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <p className="font-medium">Routine</p>
        <ul className="list-disc space-y-1 pl-5 text-foreground/80">
          <li>
            Save leads to a list named <span className="font-medium">{guide.listName}</span>.
          </li>
          {NAVIGATOR_ROUTINE.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
