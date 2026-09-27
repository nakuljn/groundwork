"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { addProspectsToPeople } from "@/app/actions";
import type { Prospect } from "@/lib/prospect-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ProspectTable({
  runId,
  prospects,
  added,
  duplicateIndexes = [],
}: {
  runId: number;
  prospects: Prospect[];
  added: number[];
  duplicateIndexes?: number[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<number[]>(() =>
    prospects
      .map((_, i) => i)
      .filter((i) => !added.includes(i) && !duplicateIndexes.includes(i)),
  );

  const toggle = (i: number) =>
    setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));

  const addSelected = () => {
    startTransition(async () => {
      try {
        const count = await addProspectsToPeople(runId, selected);
        setSelected([]);
        router.refresh();
        toast.success(`Saved ${count} prospects`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not add");
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Firm / person</TableHead>
              <TableHead>Type · size</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Why they fit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prospects.map((p, i) => {
              const isAdded = added.includes(i);
              const isDuplicate = duplicateIndexes.includes(i);
              return (
                <TableRow
                  key={i}
                  className={isAdded || isDuplicate ? "opacity-50" : undefined}
                >
                  <TableCell className="align-top">
                    {isAdded ? (
                      <Badge variant="secondary">Saved</Badge>
                    ) : isDuplicate ? (
                      <Badge variant="outline">On list</Badge>
                    ) : (
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={selected.includes(i)}
                        onChange={() => toggle(i)}
                      />
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <p className="font-medium">{p.firmName || p.personName}</p>
                    {p.firmName && p.personName && (
                      <p className="text-sm text-foreground/70">
                        {p.personName}
                        {p.role && ` · ${p.role}`}
                      </p>
                    )}
                    {p.sourceUrl && (
                      <a
                        href={p.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-foreground/60 hover:text-foreground"
                      >
                        Source <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-sm">
                    {[p.type, p.sizeEstimate].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="align-top text-sm">{p.city || "—"}</TableCell>
                  <TableCell className="align-top text-sm">
                    <div className="space-y-0.5">
                      {p.email && <p>{p.email}</p>}
                      {p.phone && <p>{p.phone}</p>}
                      {p.website && (
                        <a href={p.website} target="_blank" rel="noreferrer" className="block hover:underline">
                          Website
                        </a>
                      )}
                      {p.linkedinUrl && (
                        <a href={p.linkedinUrl} target="_blank" rel="noreferrer" className="block hover:underline">
                          LinkedIn
                        </a>
                      )}
                      {!p.email && !p.phone && !p.website && !p.linkedinUrl && "—"}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs whitespace-normal align-top text-sm text-foreground/80">
                    {p.whyFit}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Button onClick={addSelected} disabled={pending || selected.length === 0}>
        <UserPlus className="mr-1.5 h-4 w-4" />
        {pending ? "Saving…" : `Save ${selected.length} to list`}
      </Button>
    </div>
  );
}

export function CopyText({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3">
      <code className="flex-1 whitespace-pre-wrap break-words font-mono text-sm">{text}</code>
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          toast.success("Copied");
        }}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
