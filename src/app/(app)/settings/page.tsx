import Link from "next/link";
import { logoutAction } from "@/app/auth-actions";
import { getWorkspaceContext } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { BlueprintSettings } from "@/components/blueprint-settings";
import { CoachPanel } from "@/components/coach-panel";
import { ProductSettingsForm } from "@/components/product-settings-form";
import { SenderProfileForm } from "@/components/sender-profile-form";
import { SpendSummary } from "@/components/spend-summary";
import { MarketingSettingsForm } from "@/components/marketing-settings-form";
import { ensureMarketingSettings } from "@/lib/marketing";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SettingsPage() {
  const ctx = await getWorkspaceContext();
  const product = ctx.product;
  const marketingSettings = product ? await ensureMarketingSettings(product.id) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Your product, profile, marketing voice, and spend overview."
        nextAction={product ? "Keep your brief up to date so AI drafts stay accurate." : "Add your product first."}
      />

      <Card>
        <CardHeader>
          <CardTitle>Product</CardTitle>
          <CardDescription>
            Save details first, then click Understand my product to build a brief.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductSettingsForm product={product} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
          <CardDescription>Name and contact details added to every message you draft.</CardDescription>
        </CardHeader>
        <CardContent>
          <SenderProfileForm product={product} />
        </CardContent>
      </Card>

      {marketingSettings && (
        <Card id="marketing" className="scroll-mt-6">
          <CardHeader>
            <CardTitle>LinkedIn marketing</CardTitle>
            <CardDescription>
              Reminders, writing voice, past posts for context, and visual direction.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MarketingSettingsForm settings={marketingSettings} />
          </CardContent>
        </Card>
      )}

      <Card id="blueprint" className="scroll-mt-6">
        <CardHeader>
          <CardTitle>Workspace blueprint</CardTitle>
          <CardDescription>
            Segments, tracks, and messaging tailored to your product. Re-run agents or review
            version history here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BlueprintSettings blueprint={ctx.blueprint} workspaceId={ctx.workspaceId} />
        </CardContent>
      </Card>

      {product && (
        <Card id="coach" className="scroll-mt-6">
          <CardHeader>
            <CardTitle>Weekly coach</CardTitle>
            <CardDescription>
              Suggested blueprint tweaks from your outreach activity and reply rates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CoachPanel
              workspaceId={ctx.workspaceId}
              productId={product.id}
              blueprint={ctx.blueprint}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Sign out or upgrade your workspace plan.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
          <Link href="/welcome" className="text-sm underline self-center">
            View pricing
          </Link>
        </CardContent>
      </Card>

      {product && (
        <Card id="spend" className="scroll-mt-6">
          <CardHeader>
            <CardTitle>Spend</CardTitle>
            <CardDescription>
              Costs from your{" "}
              <Link href="/activity" className="underline">
                activity log
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SpendSummary productId={product.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
