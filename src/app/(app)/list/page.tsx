import Link from "next/link";
import { getCategories } from "@/lib/categories-server";
import { getWorkspaceContext } from "@/lib/workspace";
import { MessageGroups } from "@/components/message-groups";
import { PageHeader } from "@/components/page-header";

export default async function MessagesPage() {
  const { product, blueprint } = await getWorkspaceContext();

  if (!product) {
    return (
      <div>
        <PageHeader
          title="LinkedIn messages"
          description="Connection notes, InMail, and follow-ups for advocates and each role at a firm."
          nextAction="Set up your product in Settings."
        />
        <Link href="/settings" className="text-sm underline">
          Go to Settings
        </Link>
      </div>
    );
  }

  const categories = await getCategories(product.id, blueprint);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="LinkedIn messages"
        description="Find people in Sales Navigator, then copy the LinkedIn message written for their role."
        nextAction="Open the group that matches who you are writing to and draft its four templates."
      />

      <MessageGroups categories={categories} productId={product.id} blueprint={blueprint} />

      <p className="text-sm text-muted-foreground">
        Messages use your profile and product details from{" "}
        <Link href="/settings" className="underline">
          Settings
        </Link>
        .
      </p>
    </div>
  );
}
