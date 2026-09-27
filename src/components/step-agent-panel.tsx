"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { Contact, OutreachCategory, Product } from "@/types/domain";
import {
  ProspectSearchPanel,
  type ResearchData,
} from "@/components/prospect-search-panel";
import { DraftMessagesChecklist } from "@/components/draft-messages-checklist";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StepAgentPanel({
  agent,
  product,
  research,
  contacts,
  categories,
}: {
  agent: string;
  product: Product;
  research: ResearchData | null;
  contacts: Contact[];
  categories: OutreachCategory[];
}) {
  if (agent === "find_prospects") {
    return (
      <div className="space-y-3 rounded-xl border bg-background p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4" />
          Find prospects
        </div>
        <ProspectSearchPanel product={product} research={research} contacts={contacts} compact />
        {contacts.length > 0 && (
          <Link href="/list" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            View list ({contacts.length})
          </Link>
        )}
      </div>
    );
  }

  if (agent === "draft_messages") {
    return (
      <div className="space-y-3 rounded-xl border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Draft outreach messages
          </div>
          <Link href="/list" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Open Messages
          </Link>
        </div>
        <DraftMessagesChecklist categories={categories} />
      </div>
    );
  }

  return null;
}
