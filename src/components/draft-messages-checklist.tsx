"use client";

import Link from "next/link";
import type { OutreachCategory } from "@/types/domain";
import { categoryHasLinkedInDraft, savedFieldsOf } from "@/lib/categories";
import { linkedinTemplateKinds, savedCountForChannel } from "@/lib/outreach";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKEDIN_TOTAL = linkedinTemplateKinds().length;

export function DraftMessagesChecklist({ categories }: { categories: OutreachCategory[] }) {
  return (
    <div className="space-y-2 rounded-xl border bg-background p-4">
      <p className="text-sm text-muted-foreground">
        Draft and copy LinkedIn messages. Each row is one audience group.
      </p>
      <ul className="divide-y rounded-lg border">
        {categories.map((cat) => {
          const savedFields = savedFieldsOf(cat);
          const saved = savedCountForChannel(savedFields, "linkedin");
          const drafted = categoryHasLinkedInDraft(cat);
          return (
            <li key={cat.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{cat.name}</p>
                <p className="text-xs text-muted-foreground">
                  {drafted ? `${saved}/${LINKEDIN_TOTAL} saved` : "Not drafted yet"}
                </p>
              </div>
              <Link
                href={`/list#group-${cat.key}`}
                className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
              >
                {drafted ? "Open" : "Draft"}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
