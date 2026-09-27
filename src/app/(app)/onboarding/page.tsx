import { OnboardingWizard } from "@/components/onboarding-wizard";
import { PageHeader } from "@/components/page-header";
import { getWorkspaceContext } from "@/lib/workspace";

export default async function OnboardingPage() {
  const ctx = await getWorkspaceContext();
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Tailor your workspace"
        description="Agents study your product and generate audience segments, tracks, and messaging for your market."
        nextAction="Run the agents, review the blueprint, then publish."
      />
      <OnboardingWizard workspaceId={ctx.workspaceId} />
    </div>
  );
}
