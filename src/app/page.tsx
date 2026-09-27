import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { getSessionUser } from "@/lib/auth/session";
import type { AuthTab } from "@/components/auth-modal";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const session = await getSessionUser();
  const params = await searchParams;
  const initialAuth =
    params.auth === "signin" || params.auth === "signup" ? (params.auth as AuthTab) : null;

  if (session && !initialAuth) {
    redirect("/dashboard");
  }

  return (
    <LandingPage
      isLoggedIn={Boolean(session)}
      username={session?.user.username}
      initialAuth={initialAuth}
    />
  );
}
