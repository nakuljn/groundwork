"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { loginAction, signupAction } from "@/app/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          try {
            await loginAction(email, password);
            toast.success("Signed in");
            router.push("/");
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Sign in failed");
          }
        });
      }}
    >
      <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          try {
            await signupAction({ email, password, name, workspaceName });
            toast.success("Workspace created");
            router.push("/onboarding");
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Signup failed");
          }
        });
      }}
    >
      <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input
        placeholder="Workspace name (e.g. HireFlow)"
        value={workspaceName}
        onChange={(e) => setWorkspaceName(e.target.value)}
      />
      <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create workspace"}
      </Button>
    </form>
  );
}
