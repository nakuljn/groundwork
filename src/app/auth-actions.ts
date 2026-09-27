"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE,
  createSession,
  createUserWithWorkspace,
  destroySession,
} from "@/lib/auth/session";

export async function signupAction(input: {
  email: string;
  password: string;
  name?: string;
  workspaceName: string;
}) {
  if (!input.email.trim() || !input.password.trim() || !input.workspaceName.trim()) {
    throw new Error("Email, password, and workspace name are required");
  }
  const { user } = await createUserWithWorkspace(input);
  const session = await createSession(user.id);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    expires: session.expiresAt,
    path: "/",
  });
}

export async function loginAction(email: string, password: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()));
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Invalid email or password");
  }
  const session = await createSession(user.id);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    expires: session.expiresAt,
    path: "/",
  });
}

export async function logoutAction() {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (sessionId) await destroySession(sessionId);
  jar.delete(SESSION_COOKIE);
  redirect("/welcome");
}
