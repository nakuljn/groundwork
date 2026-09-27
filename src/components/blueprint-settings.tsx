"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Blueprint } from "@/lib/blueprint/schema";

export function BlueprintSettings({
  blueprint,
  workspaceId,
}: {
  blueprint: Blueprint;
  workspaceId: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link href="/onboarding" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Re-run tailoring agents
        </Link>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            void navigator.clipboard.writeText(JSON.stringify(blueprint, null, 2));
          }}
        >
          Copy blueprint JSON
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Workspace {workspaceId} · blueprint v{blueprint.version} · {blueprint.segments.length}{" "}
        segments · {blueprint.tracks.length} tracks
      </p>
      <pre className="max-h-64 overflow-auto rounded-lg bg-muted/40 p-3 text-xs">
        {JSON.stringify(
          {
            product: blueprint.product.name,
            vocabulary: blueprint.vocabulary,
            segments: blueprint.segments.map((s) => s.name),
            tracks: blueprint.tracks.map((t) => t.name),
            hashtags: blueprint.content.hashtags,
          },
          null,
          2,
        )}
      </pre>
    </div>
  );
}
