import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { memberships, sessions, users, workspaces } from "@/db/schema";
import { hashPassword } from "./password";

export const SESSION_COOKIE = "groundwork_session";

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export async function createSession(userId: number) {
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await db.insert(sessions).values({ id, userId, expiresAt });
  return { id, expiresAt };
}

export async function destroySession(sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function getSessionUser() {
  const jar = await cookies();
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const [row] = await db
    .select({
      user: users,
      sessionId: sessions.id,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())));

  return row ?? null;
}

export async function requireSessionUser() {
  const row = await getSessionUser();
  if (!row) throw new Error("Not signed in");
  return row;
}

export async function getUserWorkspace(userId: number) {
  const [membership] = await db
    .select({ workspace: workspaces })
    .from(memberships)
    .innerJoin(workspaces, eq(workspaces.id, memberships.workspaceId))
    .where(eq(memberships.userId, userId))
    .limit(1);
  return membership?.workspace ?? null;
}

export async function findUserByUsername(username: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, normalizeUsername(username)));
  return user ?? null;
}

export async function createUserWithWorkspace(input: {
  username: string;
  password: string;
  name?: string;
  workspaceName: string;
}) {
  const username = normalizeUsername(input.username);
  const existing = await findUserByUsername(username);
  if (existing) throw new Error("Username is already taken");

  const passwordHash = hashPassword(input.password);
  const [user] = await db
    .insert(users)
    .values({
      username,
      name: input.name?.trim() || null,
      passwordHash,
    })
    .returning();

  const slug = input.workspaceName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  const [workspace] = await db
    .insert(workspaces)
    .values({
      name: input.workspaceName.trim(),
      slug: `${slug || "workspace"}-${user.id}`,
      ownerUserId: user.id,
    })
    .returning();

  await db.insert(memberships).values({
    workspaceId: workspace.id,
    userId: user.id,
    role: "owner",
  });

  return { user, workspace };
}
