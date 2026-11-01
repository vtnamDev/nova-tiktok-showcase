import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import {
  category,
  invitation,
  product,
  productCategory,
  productMedia,
  productVariant,
  user,
  userRole,
} from "../../drizzle/schema";
import { getDb } from "./db";
import { isSafeTikTokUrl, slugify } from "./validation";

const variantInput = z.object({
  name: z.string().trim().min(1).max(120),
  sku: z.string().trim().max(80).optional().nullable(),
  attributes: z.record(z.string(), z.string()).default({}),
  priceOverride: z.number().nonnegative().nullable().optional(),
  tiktokUrlOverride: z.string().max(2048).nullable().optional(),
  isActive: z.boolean().default(true),
});

const productInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(5000).default(""),
  basePrice: z.number().int().nonnegative().max(999999999999999),
  baseTiktokUrl: z.string().max(2048).nullable().optional(),
  status: z.enum(["draft", "published", "archived"]),
  featured: z.boolean().default(false),
  categoryIds: z.array(z.string().uuid()).max(30).default([]),
  imageUrls: z.array(z.string().url().max(2048)).max(15).default([]),
  variants: z.array(variantInput).max(100).default([]),
});

export const getAdminData = createServerFn({ method: "GET" }).handler(async () => {
  const { requireRoles } = await import("./access.server");
  const access = await requireRoles(["owner", "admin", "editor", "viewer"]);
  const db = getDb();
  const [products, categories] = await Promise.all([
    db.select().from(product).orderBy(desc(product.updatedAt)).limit(500),
    db.select().from(category).orderBy(category.sortOrder, category.name),
  ]);
  const productIds = products.map((item) => item.id);
  const [links, variants, media] = productIds.length ? await Promise.all([
    db.select().from(productCategory),
    db.select().from(productVariant),
    db.select().from(productMedia),
  ]) : [[], [], []];

  let members: Array<{ userId: string; email: string; name: string; role: string }> = [];
  if (access.role === "owner" || access.role === "admin") {
    const rows = await db.select({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: userRole.role,
    }).from(user).leftJoin(userRole, eq(userRole.userId, user.id)).orderBy(user.email).limit(200);
    members = rows.map((row) => ({ ...row, role: row.role ?? "viewer" }));
  }

  return {
    role: access.role,
    products: products.map((item) => ({
      ...item,
      basePrice: Number(item.basePrice),
      categoryIds: links.filter((link) => link.productId === item.id).map((link) => link.categoryId),
      variants: variants.filter((variant) => variant.productId === item.id).map((variant) => ({
        ...variant,
        priceOverride: variant.priceOverride == null ? null : Number(variant.priceOverride),
      })),
      images: media.filter((image) => image.productId === item.id).map((image) => image.url),
    })),
    categories,
    members,
  };
});

export const saveProduct = createServerFn({ method: "POST" })
  .inputValidator((input) => productInput.parse(input))
  .handler(async ({ data }) => {
    const { requireRoles } = await import("./access.server");
    const access = await requireRoles(["owner", "admin", "editor"]);
    for (const url of [data.baseTiktokUrl, ...data.variants.map((variant) => variant.tiktokUrlOverride)]) {
      if (url && !isSafeTikTokUrl(url)) throw new Error("TikTok URL không hợp lệ.");
    }

    const db = getDb();
    const slug = slugify(data.slug || data.name);
    const result = await db.transaction(async (tx) => {
      let productId = data.id;
      const values = {
        name: data.name,
        slug,
        description: data.description,
        basePrice: String(data.basePrice),
        baseTiktokUrl: data.baseTiktokUrl || null,
        status: data.status,
        featured: data.featured,
        updatedBy: access.user.id,
        updatedAt: new Date(),
      };

      if (productId) {
        await tx.update(product).set(values).where(eq(product.id, productId));
      } else {
        const [created] = await tx.insert(product).values({
          ...values,
          createdBy: access.user.id,
        }).returning({ id: product.id });
        productId = created.id;
      }

      await tx.delete(productCategory).where(eq(productCategory.productId, productId));
      if (data.categoryIds.length) {
        await tx.insert(productCategory).values(data.categoryIds.map((categoryId) => ({
          productId: productId!,
          categoryId,
        })));
      }

      await tx.delete(productVariant).where(eq(productVariant.productId, productId));
      if (data.variants.length) {
        await tx.insert(productVariant).values(data.variants.map((variant, index) => ({
          productId: productId!,
          name: variant.name,
          sku: variant.sku || null,
          attributes: variant.attributes,
          priceOverride: variant.priceOverride == null ? null : String(variant.priceOverride),
          tiktokUrlOverride: variant.tiktokUrlOverride || null,
          isActive: variant.isActive,
          sortOrder: index,
        })));
      }

      await tx.delete(productMedia).where(eq(productMedia.productId, productId));
      if (data.imageUrls.length) {
        await tx.insert(productMedia).values(data.imageUrls.map((url, index) => ({
          productId: productId!,
          url,
          alt: data.name,
          sortOrder: index,
        })));
      }
      return productId;
    });

    return { id: result };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { requireRoles } = await import("./access.server");
    await requireRoles(["owner", "admin"]);
    await getDb().delete(product).where(eq(product.id, data.id));
    return { ok: true };
  });

export const saveCategory = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(100),
    description: z.string().max(500).default(""),
    isActive: z.boolean().default(true),
  }).parse(input))
  .handler(async ({ data }) => {
    const { requireRoles } = await import("./access.server");
    await requireRoles(["owner", "admin"]);
    const db = getDb();
    const values = { name: data.name, slug: slugify(data.name), description: data.description, isActive: data.isActive, updatedAt: new Date() };
    if (data.id) {
      await db.update(category).set(values).where(eq(category.id, data.id));
      return { id: data.id };
    }
    const [created] = await db.insert(category).values(values).returning({ id: category.id });
    return { id: created.id };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { requireRoles } = await import("./access.server");
    await requireRoles(["owner", "admin"]);
    await getDb().delete(category).where(eq(category.id, data.id));
    return { ok: true };
  });

export const createInvitation = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({
    email: z.string().email().max(254),
    role: z.enum(["admin", "editor", "viewer"]),
  }).parse(input))
  .handler(async ({ data }) => {
    const { requireRoles } = await import("./access.server");
    const access = await requireRoles(["owner"]);
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const db = getDb();
    await db.insert(invitation).values({
      email: data.email.trim().toLowerCase(),
      role: data.role,
      tokenHash,
      createdBy: access.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    const origin = process.env.BETTER_AUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    return { url: `${origin}/invite/${token}`, expiresInDays: 7 };
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({
    userId: z.string().min(1),
    role: z.enum(["owner", "admin", "editor", "viewer"]),
  }).parse(input))
  .handler(async ({ data }) => {
    const { requireRoles } = await import("./access.server");
    const access = await requireRoles(["owner"]);
    const db = getDb();
    const [target] = await db.select().from(userRole).where(eq(userRole.userId, data.userId)).limit(1);
    if (target?.role === "owner" && data.role !== "owner") {
      const owners = await db.select({ userId: userRole.userId }).from(userRole)
        .where(eq(userRole.role, "owner"));
      if (owners.length <= 1) throw new Error("Không thể hạ quyền Owner cuối cùng.");
    }
    await db.insert(userRole).values({
      userId: data.userId,
      role: data.role,
      assignedBy: access.user.id,
    }).onConflictDoUpdate({
      target: userRole.userId,
      set: { role: data.role, assignedBy: access.user.id },
    });
    return { ok: true };
  });
