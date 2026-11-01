import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  category,
  catalogEvent,
  product,
  productCategory,
  productMedia,
  productVariant,
} from "../../drizzle/schema";
import { getDb } from "./db";
import { isSafeTikTokUrl } from "./validation";

export const getPublicCatalog = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = getDb();
    const [products, categories] = await Promise.all([
      db.select().from(product).where(eq(product.status, "published"))
        .orderBy(desc(product.featured), desc(product.updatedAt)).limit(200),
      db.select().from(category).where(eq(category.isActive, true)).orderBy(category.sortOrder, category.name),
    ]);

    if (!products.length) return { configured: true, products: [], categories };

    const productIds = products.map((item) => item.id);
    const [links, variants, media] = await Promise.all([
      db.select().from(productCategory).where(inArray(productCategory.productId, productIds)),
      db.select().from(productVariant).where(and(
        inArray(productVariant.productId, productIds),
        eq(productVariant.isActive, true),
      )).orderBy(productVariant.sortOrder),
      db.select().from(productMedia).where(inArray(productMedia.productId, productIds)).orderBy(productMedia.sortOrder),
    ]);

    return {
      configured: true,
      categories,
      products: products.map((item) => ({
        ...item,
        price: Number(item.basePrice),
        tiktokUrl: item.baseTiktokUrl,
        categories: links.filter((link) => link.productId === item.id)
          .map((link) => categories.find((c) => c.id === link.categoryId))
          .filter(Boolean),
        variants: variants.filter((variant) => variant.productId === item.id).map((variant) => ({
          ...variant,
          price: variant.priceOverride == null ? Number(item.basePrice) : Number(variant.priceOverride),
          tiktokUrl: variant.tiktokUrlOverride || item.baseTiktokUrl,
        })),
        images: media.filter((image) => image.productId === item.id),
      })),
    };
  } catch (error) {
    console.error("Public catalog unavailable:", error);
    return { configured: false, products: [], categories: [] };
  }
});

export const trackCatalogEvent = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().optional(),
    eventType: z.enum(["view", "tiktok_click"]),
  }).parse(input))
  .handler(async ({ data }) => {
    try {
      const db = getDb();
      const [published] = await db.select({ id: product.id }).from(product)
        .where(and(eq(product.id, data.productId), eq(product.status, "published"))).limit(1);
      if (published) {
        await db.insert(catalogEvent).values({
          productId: data.productId,
          variantId: data.variantId,
          eventType: data.eventType,
        });
      }
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });
