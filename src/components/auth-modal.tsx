"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { loginAction, signupAction } from "@/app/auth-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type AuthTab = "signin" | "signup";

export function AuthModal({
  open,
  onOpenChange,
  defaultTab = "signin",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: AuthTab;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>(defaultTab);
  const [pending, startTransition] = useTransition();

  const [signInUsername, setSignInUsername] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to Groundwork</DialogTitle>
          <DialogDescription>
            Sign in to your workspace or create a new one.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as AuthTab)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-4 space-y-4">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  try {
                    await loginAction(signInUsername, signInPassword);
                    toast.success("Signed in");
                    onOpenChange(false);
                    router.push("/dashboard");
                    router.refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Sign in failed");
                  }
                });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="signin-username">Username</Label>
                <Input
                  id="signin-username"
                  autoComplete="username"
                  required
                  value={signInUsername}
                  onChange={(e) => setSignInUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-4 space-y-4">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  try {
                    await signupAction({
                      username,
                      password: signUpPassword,
                      name,
                      workspaceName,
                    });
                    toast.success("Account created");
                    onOpenChange(false);
                    router.push("/onboarding");
                    router.refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Signup failed");
                  }
                });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="signup-name">Your name</Label>
                <Input
                  id="signup-name"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-username">Username</Label>
                <Input
                  id="signup-username"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-workspace">Workspace name</Label>
                <Input
                  id="signup-workspace"
                  required
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Creating…" : "Create workspace"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
