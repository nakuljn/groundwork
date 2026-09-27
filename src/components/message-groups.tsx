import { ChevronDown } from "lucide-react";
import type { OutreachCategory } from "@/types/domain";
import { FIRM_ROLES, isFirmGroup } from "@/lib/categories";
import { FIRM_SEQUENCE } from "@/lib/sales-navigator";
import { CategoryMessagesPanel } from "@/components/category-messages-panel";

export function MessageGroups({ categories }: { categories: OutreachCategory[] }) {
  const individuals = categories.filter((c) => !isFirmGroup(c.key));
  const firmRoles = FIRM_ROLES.flatMap((role) => categories.filter((c) => c.key === role.key));

  return (
    <div className="space-y-8">
      {individuals.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Individual advocates</h2>
            <p className="text-sm text-foreground/70">
              Solo practitioners and small chambers. One person reads and decides.
            </p>
          </div>
          {individuals.map((cat) => (
            <div key={cat.id} id={`group-${cat.key}`} className="scroll-mt-6">
              <CategoryMessagesPanel category={cat} />
            </div>
          ))}
        </section>
      )}

      {firmRoles.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Firms, by who you are writing to</h2>
            <p className="text-sm text-foreground/70">
              A separate set of messages for each role, in the order to approach them. Contacts at a
              firm get the set that matches their title.
            </p>
          </div>

          <details className="group/seq rounded-lg border">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium">
              How to work through one firm
              <ChevronDown className="h-4 w-4 text-foreground/50 transition-transform group-open/seq:rotate-180" />
            </summary>
            <ol className="list-decimal space-y-1.5 border-t py-4 pl-9 pr-4 text-sm text-foreground/80">
              {FIRM_SEQUENCE.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </details>

          {firmRoles.map((cat, i) => (
            <div key={cat.id} id={`group-${cat.key}`} className="scroll-mt-6">
              <CategoryMessagesPanel category={cat} step={i + 1} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
