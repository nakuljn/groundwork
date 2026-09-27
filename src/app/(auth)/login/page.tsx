import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/signup" className="underline">
              Create a workspace
            </Link>
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
