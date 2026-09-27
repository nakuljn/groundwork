import Link from "next/link";
import { getActiveProduct } from "@/lib/product";
import { getMarketingWorkspace } from "@/lib/marketing";
import { MarketingWorkspace } from "@/components/marketing-workspace";
import { PageHeader } from "@/components/page-header";

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const product = await getActiveProduct();
  if (!product) {
    return (
      <div>
        <PageHeader
          title="LinkedIn posts"
          description="Plan and write your weekly LinkedIn content."
          nextAction="Set up your product in Settings."
        />
        <Link href="/settings" className="text-sm underline">
          Go to Settings
        </Link>
      </div>
    );
  }

  const params = await searchParams;
  const weekStart = params.week ? new Date(`${params.week}T00:00:00`) : undefined;
  const { settings, week, slots, postingDays, today } = await getMarketingWorkspace(product.id, {
    weekStart,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="LinkedIn posts"
        description="Your week is planned by date. Groundwork knows what day it is, what you posted before, and drafts posts that start with a bold hook."
        nextAction="Pick a day in the week strip, then plan or edit that post."
      />

      <MarketingWorkspace
        product={product}
        settings={settings}
        week={week}
        slots={slots}
        postingDays={postingDays}
        today={today}
      />
    </div>
  );
}
