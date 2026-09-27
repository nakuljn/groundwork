"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Blueprint } from "@/lib/blueprint/schema";
import { applyCoachSuggestion } from "@/lib/agents/coach/graph";

type CoachSuggestion = {
  path: string;
  reason: string;
  proposed: unknown;
};

export function CoachPanel({
  workspaceId,
  productId,
  blueprint,
  onBlueprintChange,
}: {
  workspaceId: number;
  productId: number;
  blueprint: Blueprint;
  onBlueprintChange?: (next: Blueprint) => void;
}) {
  const [pending, setPending] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<CoachSuggestion[]>([]);
  const [draft, setDraft] = useState<Blueprint>(blueprint);

  const runCoach = async () => {
    setPending(true);
    try {
      const response = await fetch("/api/coach/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, productId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Coach failed");
      setSummary(payload.summary);
      setSuggestions(payload.suggestions ?? []);
      toast.success("Coach suggestions ready");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Coach failed");
    } finally {
      setPending(false);
    }
  };

  const accept = async (suggestion: CoachSuggestion) => {
    const next = applyCoachSuggestion(draft, suggestion.path, suggestion.proposed);
    setDraft(next);
    onBlueprintChange?.(next);
    try {
      const response = await fetch("/api/blueprint/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, blueprint: next }),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Publish failed");
      }
      toast.success("Suggestion applied");
      setSuggestions((prev) => prev.filter((s) => s.path !== suggestion.path));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Apply failed");
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Weekly coach reads your activity and reply rates, then proposes small blueprint tweaks you
        approve before they go live.
      </p>
      <Button disabled={pending} onClick={runCoach}>
        {pending ? "Analyzing…" : "Run weekly coach"}
      </Button>
      {summary && <p className="text-sm">{summary}</p>}
      {suggestions.length > 0 && (
        <ul className="space-y-3">
          {suggestions.map((s) => (
            <li key={s.path} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{s.path}</p>
              <p className="mt-1 text-muted-foreground">{s.reason}</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => accept(s)}>
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setSuggestions((prev) => prev.filter((item) => item.path !== s.path))
                  }
                >
                  Dismiss
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
