import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type AppRole = "owner" | "admin" | "editor" | "viewer";

export const getCurrentAccess = createServerFn({ method: "GET" }).handler(async () => {
  const { getAccess } = await import("./access.server");
  return getAccess();
});

export const checkInvitation = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ token: z.string().min(20).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const [{ invitation }, { getDb }, { createHash }, { and, eq, gt, isNull }] = await Promise.all([
      import("../../drizzle/schema"),
      import("./db"),
      import("node:crypto"),
      import("drizzle-orm"),
    ]);
    const tokenHash = createHash("sha256").update(data.token).digest("hex");
    const [row] = await getDb().select({
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    }).from(invitation).where(and(
      eq(invitation.tokenHash, tokenHash),
      isNull(invitation.acceptedAt),
      gt(invitation.expiresAt, new Date()),
    )).limit(1);
    return row ? { valid: true as const, email: row.email, role: row.role } : { valid: false as const };
  });
