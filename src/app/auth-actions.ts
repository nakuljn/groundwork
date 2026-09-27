"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { ensurePostgresAuthSchema } from "@/db/ensure-postgres-auth-schema";
import { verifyPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE,
  createSession,
  createUserWithWorkspace,
  destroySession,
  findUserByUsername,
} from "@/lib/auth/session";

async function ensureDbReady() {
  await ensurePostgresAuthSchema();
}

export async function signupAction(input: {
  username: string;
  password: string;
  name?: string;
  workspaceName: string;
}) {
  await ensureDbReady();
  if (!input.username.trim() || !input.password.trim() || !input.workspaceName.trim()) {
    throw new Error("Username, password, and workspace name are required");
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
  redirect("/dashboard");
}

export async function loginAction(username: string, password: string) {
  await ensureDbReady();
  const user = await findUserByUsername(username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Invalid username or password");
  }
  const session = await createSession(user.id);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    expires: session.expiresAt,
    path: "/",
  });
  redirect("/dashboard");
}

export async function logoutAction() {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (sessionId) await destroySession(sessionId);
  jar.delete(SESSION_COOKIE);
  redirect("/");
}
