"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Blueprint } from "@/lib/blueprint/schema";

export function OnboardingWizard({ workspaceId }: { workspaceId: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [productName, setProductName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [goals, setGoals] = useState("");
  const [rawContext, setRawContext] = useState("");
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [artifacts, setArtifacts] = useState<Array<{ agent: string; summary: string }>>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [liveAgent, setLiveAgent] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = async () => {
    if (!productName.trim()) {
      toast.error("Product name is required");
      return;
    }
    setPending(true);
    setArtifacts([]);
    setIssues([]);
    setLiveAgent(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/onboarding/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, productName, websiteUrl, goals, rawContext }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Onboarding failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const lines = chunk.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event: "));
          const dataLine = lines.find((l) => l.startsWith("data: "));
          if (!eventLine || !dataLine) continue;

          const event = eventLine.replace("event: ", "");
          const data = JSON.parse(dataLine.replace("data: ", ""));

          if (event === "update") {
            for (const [node, update] of Object.entries(data as Record<string, StreamUpdate>)) {
              setLiveAgent(node);
              if (update.artifacts?.length) {
                setArtifacts((prev) => {
                  const merged = [...prev];
                  for (const artifact of update.artifacts ?? []) {
                    if (!merged.some((m) => m.agent === artifact.agent)) merged.push(artifact);
                  }
                  return merged;
                });
              }
              if (update.issues?.length) setIssues(update.issues);
              if (update.blueprint) setBlueprint(update.blueprint);
            }
          }

          if (event === "done") {
            setBlueprint(data.blueprint ?? null);
            setIssues(data.issues ?? []);
            if (data.artifacts) setArtifacts(data.artifacts);
            toast.success("Blueprint draft ready for review");
            router.refresh();
          }

          if (event === "error") {
            throw new Error(data.error ?? "Onboarding failed");
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "Onboarding failed");
    } finally {
      setPending(false);
      setLiveAgent(null);
    }
  };

  const publish = async () => {
    if (!blueprint) return;
    setPending(true);
    try {
      const response = await fetch("/api/blueprint/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, blueprint }),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Publish failed");
      }
      toast.success("Blueprint published");
      router.push("/settings");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Publish failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-6 rounded-xl border bg-card p-6">
      <div className="grid gap-3">
        <Input
          placeholder="Product name"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
        />
        <Input
          placeholder="Website URL"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
        />
        <Input
          placeholder="GTM goal (e.g. book demos with hiring managers)"
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
        />
        <Textarea
          placeholder="Paste docs, pitch, or notes about the product and audience"
          value={rawContext}
          onChange={(e) => setRawContext(e.target.value)}
          rows={6}
        />
      </div>

      <Button disabled={pending} onClick={run}>
        {pending ? (liveAgent ? `Running ${liveAgent}…` : "Agents working…") : "Run tailoring agents"}
      </Button>

      {artifacts.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Agent progress</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {artifacts.map((a) => (
              <li key={a.agent}>
                {a.agent}: {a.summary}
              </li>
            ))}
          </ul>
        </div>
      )}

      {issues.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive">Issues to fix</p>
          <ul className="mt-1 list-disc pl-5">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {blueprint && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Blueprint preview</p>
          <pre className="max-h-80 overflow-auto rounded-lg bg-muted/40 p-3 text-xs">
            {JSON.stringify(blueprint, null, 2)}
          </pre>
          <Button disabled={pending} onClick={publish}>
            Publish blueprint
          </Button>
        </div>
      )}
    </div>
  );
}

type StreamUpdate = {
  artifacts?: Array<{ agent: string; summary: string }>;
  issues?: string[];
  blueprint?: Blueprint;
};
