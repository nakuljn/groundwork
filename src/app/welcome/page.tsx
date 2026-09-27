import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-lg font-semibold">Groundwork</span>
        <div className="flex gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Sign in
          </Link>
          <Link href="/signup" className={cn(buttonVariants({ size: "sm" }))}>
            Start free
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-20 pt-10">
        <section className="space-y-6">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
            A growth workspace that tailors itself to your product and audience
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Groundwork agents learn your market, design segments and tracks, draft outreach, plan
            content, and coach you weekly — whether you sell legal tech, hiring tools, or anything
            else.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className={cn(buttonVariants())}>
              Create workspace
            </Link>
            <Link href="/login" className={cn(buttonVariants({ variant: "outline" }))}>
              Sign in
            </Link>
          </div>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Agent-tailored blueprint",
              body: "Segments, roles, personas, Sales Navigator filters, tracks, and content strategy generated for your ICP.",
            },
            {
              title: "Founder execution loop",
              body: "Plan tracks, find prospects, draft LinkedIn messages, publish posts, and log activity in one place.",
            },
            {
              title: "Weekly coach",
              body: "Review reply rates and get suggested blueprint tweaks you approve before they go live.",
            },
          ].map((card) => (
            <div key={card.title} className="rounded-xl border bg-card p-5">
              <h2 className="font-medium">{card.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{card.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-16 rounded-xl border bg-muted/20 p-8">
          <h2 className="text-xl font-semibold">Pricing</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-background p-5">
              <p className="font-medium">Free</p>
              <p className="mt-1 text-2xl font-semibold">$0</p>
              <p className="mt-2 text-sm text-muted-foreground">1 workspace, core agents, SQLite/local dev.</p>
            </div>
            <div className="rounded-lg border bg-background p-5">
              <p className="font-medium">Pro</p>
              <p className="mt-1 text-2xl font-semibold">$49/mo</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Supabase Postgres, team seats, metered AI credits, Stripe billing.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
