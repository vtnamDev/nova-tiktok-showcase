import { getRequestHeaders } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
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
