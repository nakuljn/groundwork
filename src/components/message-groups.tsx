"use client";

import { useCallback, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { OutreachCategory } from "@/types/domain";
import type { Blueprint } from "@/lib/blueprint/schema";
import { messageGroupsFromBlueprint, orgApproachSequence } from "@/lib/blueprint/helpers";
import { isFirmGroupKey } from "@/lib/categories";
import { CategoryMessagesPanel } from "@/components/category-messages-panel";
import { FirmTargetBar } from "@/components/firm-target-bar";

export function MessageGroups({
  categories,
  productId,
  blueprint,
}: {
  categories: OutreachCategory[];
  productId: number;
  blueprint: Blueprint;
}) {
  const [preview, setPreview] = useState({ name: "", firm: "" });
  const onPreviewChange = useCallback((next: { name: string; firm: string }) => {
    setPreview(next);
  }, []);

  const groups = messageGroupsFromBlueprint(blueprint);
  const individuals = categories.filter((c) => !isFirmGroupKey(c.key));
  const orgGroups = groups.filter((g) => g.kind === "organization");
  const orgCategories = orgGroups.flatMap((role) =>
    categories.filter((c) => c.key === role.key),
  );
  const orgSequence = orgApproachSequence(blueprint);

  return (
    <div className="space-y-8">
      {individuals.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {blueprint.vocabulary.individualSegmentLabel}
            </h2>
            <p className="text-sm text-foreground/70">
              {blueprint.segments.find((s) => s.kind === "individual")?.description}
            </p>
          </div>
          {individuals.map((cat) => (
            <div key={cat.id} id={`group-${cat.key}`} className="scroll-mt-6">
              <CategoryMessagesPanel category={cat} blueprint={blueprint} />
            </div>
          ))}
        </section>
      )}

      {orgCategories.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {blueprint.vocabulary.organizationSegmentLabel}
            </h2>
            <p className="text-sm text-foreground/70">
              A separate set of messages for each role, in the order to approach them.
            </p>
          </div>

          <FirmTargetBar
            productId={productId}
            blueprint={blueprint}
            onPreviewChange={onPreviewChange}
          />

          {orgSequence.length > 0 && (
            <details className="group/seq rounded-lg border">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
                How to work through one {blueprint.vocabulary.org}
                <ChevronDown className="h-4 w-4 text-foreground/50 transition-transform group-open/seq:rotate-180" />
              </summary>
              <ol className="list-decimal space-y-1.5 border-t py-4 pl-9 pr-4 text-sm text-foreground/80">
                {orgSequence.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ol>
            </details>
          )}

          {orgCategories.map((cat, i) => (
            <div key={cat.id} id={`group-${cat.key}`} className="scroll-mt-6">
              <CategoryMessagesPanel
                category={cat}
                step={i + 1}
                previewName={preview.name}
                previewOrg={preview.firm}
                sharedPreview
                blueprint={blueprint}
              />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
