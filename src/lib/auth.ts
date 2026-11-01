import { createHash } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { account, invitation, session, user, userRole, verification } from "../../drizzle/schema";
import { getDb } from "./db";

let authInstance: ReturnType<typeof betterAuth> | undefined;

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function getAuth() {
  if (authInstance) return authInstance;

  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be set to a random value of at least 32 characters.");
  }

  const bootstrapEmail = process.env.BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase();
  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const db = getDb();

  authInstance = betterAuth({
    appName: "Nova Store",
    secret,
    baseURL: process.env.BETTER_AUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
    trustedOrigins: [
      "http://localhost:3000",
      ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
      "https://*.vercel.app",
    ],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 10,
      maxPasswordLength: 128,
    },
    socialProviders: googleConfigured ? {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    } : {},
    account: {
      accountLinking: {
        enabled: true,
        disableImplicitLinking: true,
      },
    },
    user: {
      additionalFields: {
        inviteToken: {
          type: "string",
          required: false,
          input: true,
          returned: false,
        },
      },
    },
    plugins: [
      username({
        minUsernameLength: 3,
        maxUsernameLength: 30,
        usernameValidator: (value) => /^[a-z0-9_]{3,30}$/.test(value),
      }),
      tanstackStartCookies(),
    ],
    databaseHooks: {
      user: {
        create: {
          before: async (newUser) => {
            const ownerExists = await db.select({ id: userRole.userId })
              .from(userRole).where(eq(userRole.role, "owner")).limit(1);
            const email = newUser.email.trim().toLowerCase();

            // The first account is restricted to the exact bootstrap email.
            // Promote that verified identity to Owner once through Neon SQL.
            if (ownerExists.length === 0 && bootstrapEmail && email === bootstrapEmail) {
              return { data: { ...newUser, inviteToken: null } };
            }

            const token = (newUser as typeof newUser & { inviteToken?: string }).inviteToken;
            if (!token) {
              throw new APIError("FORBIDDEN", { message: "Tài khoản chỉ được tạo bằng lời mời hợp lệ." });
            }

            const [validInvite] = await db.select({ id: invitation.id })
              .from(invitation)
              .where(and(
                eq(invitation.email, email),
                eq(invitation.tokenHash, sha256(token)),
                isNull(invitation.acceptedAt),
                gt(invitation.expiresAt, new Date()),
              )).limit(1);

            if (!validInvite) {
              throw new APIError("FORBIDDEN", { message: "Lời mời không hợp lệ hoặc đã hết hạn." });
            }
            return { data: newUser };
          },
          after: async (createdUser) => {
            const token = (createdUser as typeof createdUser & { inviteToken?: string }).inviteToken;
            if (token) {
              const [validInvite] = await db.select().from(invitation)
                .where(and(
                  eq(invitation.email, createdUser.email.toLowerCase()),
                  eq(invitation.tokenHash, sha256(token)),
                  isNull(invitation.acceptedAt),
                  gt(invitation.expiresAt, new Date()),
                )).limit(1);

              if (validInvite) {
                await db.insert(userRole).values({
                  userId: createdUser.id,
                  role: validInvite.role,
                  assignedBy: validInvite.createdBy,
                }).onConflictDoUpdate({
                  target: userRole.userId,
                  set: { role: validInvite.role, assignedBy: validInvite.createdBy },
                });
                await db.update(invitation).set({ acceptedAt: new Date() })
                  .where(eq(invitation.id, validInvite.id));
              }
              await db.update(user).set({ inviteToken: null }).where(eq(user.id, createdUser.id));
            } else {
              await db.insert(userRole).values({ userId: createdUser.id, role: "viewer" }).onConflictDoNothing();
            }
          },
        },
      },
    },
  });

  return authInstance;
}
