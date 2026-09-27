import { AppSidebar } from "@/components/app-sidebar";
import { BlueprintProvider } from "@/components/blueprint-provider";
import { Toaster } from "@/components/ui/sonner";
import { getWorkspaceContext } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { blueprint } = await getWorkspaceContext();

  return (
    <BlueprintProvider blueprint={blueprint}>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
        </main>
        <Toaster richColors position="top-right" />
      </div>
    </BlueprintProvider>
  );
}
