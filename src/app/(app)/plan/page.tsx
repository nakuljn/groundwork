import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { getActiveProduct } from "@/lib/product";
import { MAX_ACTIVE_TRACKS, TRACK_TEMPLATES, getTracks } from "@/lib/tracks";
import { getCategories } from "@/lib/categories-server";
import { getLatestResearchRun, parseRun } from "@/lib/prospect-research";
import {
  ResumeTrackButtons,
  StartTrackButton,
  TrackCard,
} from "@/components/track-card";
import type { ResearchData } from "@/components/prospect-search-panel";
import { PageHeader } from "@/components/page-header";
import { formatChannelLabel } from "@/lib/spend";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default async function PlanPage() {
  const product = await getActiveProduct();

  if (!product) {
    return (
      <div>
        <PageHeader
          title="Plan"
          description="Pick a sales track and work through it step by step."
          nextAction="Set up your product in Settings."
        />
        <Link href="/settings" className="text-sm underline">
          Go to Settings
        </Link>
      </div>
    );
  }

  const [all, contactRows, categories, run] = await Promise.all([
    getTracks(product.id),
    db
      .select()
      .from(contacts)
      .where(eq(contacts.productId, product.id))
      .orderBy(desc(contacts.createdAt)),
    getCategories(product.id),
    getLatestResearchRun(product.id),
  ]);

  const research: ResearchData | null = run
    ? {
        runId: run.id,
        target: run.target,
        location: run.location,
        error: run.error,
        sourceCount: run.sourceCount,
        ...parseRun(run),
      }
    : null;

  const active = all.filter((t) => t.status === "active");
  const atLimit = active.length >= MAX_ACTIVE_TRACKS;
  const currentStep = active[0]?.current?.title;

  const catalog = TRACK_TEMPLATES.map((template) => {
    const runs = all.filter((t) => t.key === template.key);
    const open = runs.find((t) => t.status === "active" || t.status === "paused");
    const completedCount = runs.filter((t) => t.status === "completed").length;
    return { template, open, completedCount };
  });

  const catalogList = (
    <ul className="divide-y rounded-xl border">
      {catalog.map(({ template, open, completedCount }) => (
        <li
          key={template.key}
          className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{template.name}</p>
              <span className="text-xs text-muted-foreground">
                {formatChannelLabel(template.channel)} · {template.skeleton.length} steps
              </span>
              {open?.status === "active" && <Badge>Running</Badge>}
              {open?.status === "paused" && (
                <Badge variant="outline">
                  Paused at {open.finished} of {open.steps.length}
                </Badge>
              )}
              {completedCount > 0 && (
                <Badge variant="secondary">
                  Completed{completedCount > 1 && ` ×${completedCount}`}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{template.summary}</p>
          </div>
          {open?.status === "active" ? (
            <Link href={`#track-${open.id}`} className="text-sm text-muted-foreground hover:text-foreground">
              View
            </Link>
          ) : open?.status === "paused" ? (
            <ResumeTrackButtons trackId={open.id} disabled={atLimit} />
          ) : (
            <StartTrackButton trackKey={template.key} disabled={atLimit} />
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Plan"
        description="One track at a time. Each step tells you exactly what to do — find people, write messages, send outreach."
        nextAction={currentStep ?? "Start the LinkedIn sales track if you have not yet."}
      />

      {active.length > 0 ? (
        <div
          className={cn(
            "grid items-start gap-6",
            active.length > 1 ? "xl:grid-cols-2" : "max-w-3xl",
          )}
        >
          {active.map((track) => (
            <TrackCard
              key={track.id}
              track={track}
              product={product}
              research={research}
              contacts={contactRows}
              categories={categories}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed px-6 py-8 text-center">
          <p className="font-medium">No track running</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start with LinkedIn sales — the most direct route to demos.
          </p>
        </div>
      )}

      {active.length > 0 ? (
        <details className="group rounded-xl border">
          <summary className="cursor-pointer px-5 py-4 text-sm font-medium">
            Other tracks
            {atLimit && (
              <span className="ml-2 font-normal text-muted-foreground">
                (pause one to start another)
              </span>
            )}
          </summary>
          <div className="border-t p-4">{catalogList}</div>
        </details>
      ) : (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Tracks</h2>
          {catalogList}
        </section>
      )}

      <p className="text-sm text-muted-foreground">
        Did something outside a track?{" "}
        <Link href="/activity" className="underline">
          Log in Activity
        </Link>
        .
      </p>
    </div>
  );
}
