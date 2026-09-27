"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Pause, Play, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import {
  deleteTrackAction,
  finishStepAction,
  setTrackStatusAction,
  startTrackAction,
} from "@/app/actions";
import type { TrackWithSteps } from "@/lib/track-types";
import type { Contact, OutreachCategory, Product, TrackStep } from "@/types/domain";
import type { ResearchData } from "@/components/prospect-search-panel";
import { Button } from "@/components/ui/button";
import { CopyText } from "@/components/research-results";
import { StepAgentPanel } from "@/components/step-agent-panel";
import { cn } from "@/lib/utils";

export type TrackResearchData = ResearchData;

function useRun() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<unknown>, success?: string) =>
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
        if (success) toast.success(success);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      }
    });
  return { pending, run };
}

export function TrackCard({
  track,
  product,
  research,
  contacts,
  categories,
}: {
  track: TrackWithSteps;
  product: Product;
  research: TrackResearchData | null;
  contacts: Contact[];
  categories: OutreachCategory[];
}) {
  const { pending, run } = useRun();
  const total = track.steps.length;
  const pct = total ? Math.round((track.finished / total) * 100) : 0;

  return (
    <section id={`track-${track.id}`} className="scroll-mt-6 rounded-xl border bg-card">
      <header className="border-b px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">{track.name}</h2>
            <p className="text-sm text-foreground/70">{track.goal}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => run(() => setTrackStatusAction(track.id, "paused"), "Track paused")}
          >
            <Pause className="mr-1 h-3.5 w-3.5" />
            Pause
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-foreground transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs tabular-nums text-foreground/70">
            {track.finished} of {total}
          </span>
        </div>
      </header>

      <ol className="divide-y">
        {track.steps.map((step) =>
          step.id === track.current?.id ? (
            <CurrentStep
              key={step.id}
              step={step}
              product={product}
              research={research}
              contacts={contacts}
              categories={categories}
            />
          ) : (
            <StepRow key={step.id} step={step} />
          ),
        )}
      </ol>
    </section>
  );
}

function CurrentStep({
  step,
  product,
  research,
  contacts,
  categories,
}: {
  step: TrackStep;
  product: Product;
  research: TrackResearchData | null;
  contacts: Contact[];
  categories: OutreachCategory[];
}) {
  const { pending, run } = useRun();
  const isAgent = step.agent === "find_prospects" || step.agent === "draft_messages";

  return (
    <li className="space-y-4 bg-muted/40 px-5 py-5">
      <div className="flex items-start gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
          {step.position}
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">Now</p>
          <h3 className="font-semibold leading-snug">{step.title}</h3>
          {!isAgent && <p className="text-sm text-foreground/70">{step.why}</p>}
        </div>
      </div>

      {step.agent ? (
        <StepAgentPanel
          agent={step.agent}
          product={product}
          research={research}
          contacts={contacts}
          categories={categories}
        />
      ) : (
        <>
          <p className="pl-9 text-sm text-foreground/70">{step.why}</p>
          <div className="whitespace-pre-wrap pl-9 text-sm leading-relaxed">{step.instructions}</div>
        </>
      )}

      {!isAgent && step.assetText && (
        <div className="pl-9">
          <CopyText text={step.assetText} />
        </div>
      )}

      {!isAgent && step.toolSuggestion && (
        <p className="flex items-start gap-2 pl-9 text-sm text-foreground/70">
          <Wrench className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {step.toolSuggestion}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 pl-9">
        <Button
          disabled={pending}
          onClick={() =>
            run(async () => {
              const { trackCompleted } = await finishStepAction(step.id, "done");
              toast.success(trackCompleted ? "Track complete" : "Done. Next step unlocked");
            })
          }
        >
          <Check className="mr-1.5 h-4 w-4" />
          Done
        </Button>
        <Button
          variant="ghost"
          disabled={pending}
          onClick={() => run(() => finishStepAction(step.id, "skipped"), "Skipped")}
        >
          Skip
        </Button>
      </div>
    </li>
  );
}

function StepRow({ step }: { step: TrackStep }) {
  const done = step.status === "done";
  const skipped = step.status === "skipped";

  return (
    <li>
      <details className="group px-5 py-3">
        <summary className="flex cursor-pointer list-none items-center gap-3">
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs",
              done && "border-foreground bg-foreground text-background",
              !done && "text-foreground/50",
            )}
          >
            {done ? <Check className="h-3.5 w-3.5" /> : step.position}
          </span>
          <span
            className={cn(
              "flex-1 text-sm",
              done && "text-foreground/60 line-through decoration-foreground/30",
              skipped && "text-foreground/40",
              step.status === "todo" && "text-foreground/50",
            )}
          >
            {step.title}
            {skipped && " (skipped)"}
            {step.agent && !done && (
              <span className="ml-2 text-xs text-foreground/40">· agent</span>
            )}
          </span>
          <ChevronRight className="h-4 w-4 text-foreground/40 transition-transform group-open:rotate-90" />
        </summary>
        <div className="mt-2 space-y-2 pl-9 text-sm text-foreground/70">
          <p>{step.why}</p>
          <p className="whitespace-pre-wrap">{step.instructions}</p>
        </div>
      </details>
    </li>
  );
}

export function StartTrackButton({ trackKey, disabled }: { trackKey: string; disabled?: boolean }) {
  const { pending, run } = useRun();
  return (
    <Button
      size="sm"
      disabled={disabled || pending}
      onClick={() => run(() => startTrackAction(trackKey), "Track started")}
    >
      <Play className="mr-1.5 h-3.5 w-3.5" />
      {pending ? "Building steps…" : "Start"}
    </Button>
  );
}

export function ResumeTrackButtons({ trackId, disabled }: { trackId: number; disabled?: boolean }) {
  const { pending, run } = useRun();
  return (
    <div className="flex gap-1">
      <Button
        size="sm"
        disabled={disabled || pending}
        onClick={() => run(() => setTrackStatusAction(trackId, "active"), "Track resumed")}
      >
        <Play className="mr-1.5 h-3.5 w-3.5" />
        Resume
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          if (confirm("Remove this track and its progress?")) {
            run(() => deleteTrackAction(trackId), "Track removed");
          }
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
