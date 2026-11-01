import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { userRole } from "../../drizzle/schema";
import { getAuth } from "./auth";
import { getDb } from "./db";

export type AppRole = "owner" | "admin" | "editor" | "viewer";

export async function getAccess() {
  const headers = getRequestHeaders();
  const session = await getAuth().api.getSession({ headers });
  if (!session) return { user: null, role: null as AppRole | null };

  const [membership] = await getDb().select({ role: userRole.role })
    .from(userRole).where(eq(userRole.userId, session.user.id)).limit(1);

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      username: session.user.username ?? null,
    },
    role: membership?.role ?? "viewer",
  };
}

export async function requireRoles(allowed: AppRole[]) {
  const access = await getAccess();
  if (!access.user) throw new Error("UNAUTHORIZED");
  if (!access.role || !allowed.includes(access.role)) throw new Error("FORBIDDEN");
  return { ...access, user: access.user, role: access.role };
}

export const getCurrentAccess = createServerFn({ method: "GET" }).handler(async () => getAccess());

export const checkInvitation = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ token: z.string().min(20).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const { createHash } = await import("node:crypto");
    const tokenHash = createHash("sha256").update(data.token).digest("hex");
    const { invitation } = await import("../../drizzle/schema");
    const { and, eq, gt, isNull } = await import("drizzle-orm");
    const [row] = await getDb().select({
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    }).from(invitation).where(and(
      eq(invitation.tokenHash, tokenHash),
      isNull(invitation.acceptedAt),
      gt(invitation.expiresAt, new Date()),
    )).limit(1);
    return row ? { valid: true, email: row.email, role: row.role } : { valid: false };
  });
