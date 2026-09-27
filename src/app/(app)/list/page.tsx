import Link from "next/link";
import { getCategories } from "@/lib/categories-server";
import { getActiveProduct } from "@/lib/product";
import { MessageGroups } from "@/components/message-groups";
import { PageHeader } from "@/components/page-header";

export default async function MessagesPage() {
  const product = await getActiveProduct();

  if (!product) {
    return (
      <div>
        <PageHeader
          title="Messages"
          description="Outreach templates for advocates and each role at a firm."
          nextAction="Set up your product in Settings."
        />
        <Link href="/settings" className="text-sm underline">
          Go to Settings
        </Link>
      </div>
    );
  }

  const categories = await getCategories(product.id);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Messages"
        description="Find people in Sales Navigator, then copy the message written for their role."
        nextAction="Open the group that matches who you are writing to and draft its six templates."
      />

      <MessageGroups categories={categories} />

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
