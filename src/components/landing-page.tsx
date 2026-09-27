"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { AuthModal, type AuthTab } from "@/components/auth-modal";
import { SignOutButton } from "@/components/sign-out-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LandingPage({
  isLoggedIn,
  username,
  initialAuth,
}: {
  isLoggedIn: boolean;
  username?: string | null;
  initialAuth?: AuthTab | null;
}) {
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>("signin");

  const openAuth = (tab: AuthTab) => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  useEffect(() => {
    if (initialAuth) {
      setAuthTab(initialAuth);
      setAuthOpen(true);
    }
  }, [initialAuth]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="text-lg font-semibold">Groundwork</span>
          </Link>
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                {username && (
                  <span className="hidden text-sm text-muted-foreground sm:inline">{username}</span>
                )}
                <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }))}>
                  Open workspace
                </Link>
                <SignOutButton compact />
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => openAuth("signin")}>
                  Sign in
                </Button>
                <Button size="sm" onClick={() => openAuth("signup")}>
                  Start free
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-6 pb-16 pt-16 md:pt-24">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
            A growth workspace that tailors itself to your product and audience
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Groundwork agents learn your market, design segments and tracks, draft outreach, plan
            content, and coach you weekly — for any product and any audience.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {isLoggedIn ? (
              <Link href="/dashboard" className={cn(buttonVariants())}>
                Go to dashboard
              </Link>
            ) : (
              <>
                <Button onClick={() => openAuth("signup")}>Create workspace</Button>
                <Button variant="outline" onClick={() => openAuth("signin")}>
                  Sign in
                </Button>
              </>
            )}
          </div>
        </section>

        <section className="border-t bg-muted/20">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="text-2xl font-semibold">How it works</h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Tell us about your product",
                  body: "Share your URL, pitch, and GTM goals. Agents study your market.",
                },
                {
                  step: "2",
                  title: "Review your blueprint",
                  body: "Segments, personas, tracks, and content strategy tailored to your ICP.",
                },
                {
                  step: "3",
                  title: "Execute and improve",
                  body: "Find prospects, draft messages, publish posts, and get weekly coach suggestions.",
                },
              ].map((item) => (
                <li key={item.step} className="rounded-xl border bg-card p-5">
                  <span className="text-xs font-medium text-muted-foreground">Step {item.step}</span>
                  <h3 className="mt-2 font-medium">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-semibold">Built for founders</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
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
                <h3 className="font-medium">{card.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{card.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t bg-muted/20">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="text-2xl font-semibold">Pricing</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border bg-card p-6">
                <p className="font-medium">Free</p>
                <p className="mt-1 text-3xl font-semibold">$0</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  One workspace, core agents, and the full execution loop.
                </p>
              </div>
              <div className="rounded-xl border bg-card p-6">
                <p className="font-medium">Pro</p>
                <p className="mt-1 text-3xl font-semibold">$49/mo</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Team seats, metered AI credits, and Stripe billing.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <span>Groundwork</span>
          <span>Sales & marketing for founders</span>
        </div>
      </footer>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultTab={authTab} />
    </div>
  );
}
