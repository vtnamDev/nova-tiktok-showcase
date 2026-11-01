import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
  jsonb,
  numeric,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const appRole = pgEnum("app_role", ["owner", "admin", "editor", "viewer"]);
export const productStatus = pgEnum("product_status", ["draft", "published", "archived"]);
export const catalogEventType = pgEnum("catalog_event_type", ["view", "tiktok_click"]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  inviteToken: text("invite_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
}, (table) => [index("session_user_idx").on(table.userId)]);

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("account_user_idx").on(table.userId)]);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("verification_identifier_idx").on(table.identifier)]);

export const userRole = pgTable("user_role", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  role: appRole("role").notNull().default("viewer"),
  assignedBy: text("assigned_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const category = pgTable("category", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const product = pgTable("product", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  basePrice: numeric("base_price", { precision: 16, scale: 0 }).notNull().default("0"),
  baseTiktokUrl: text("base_tiktok_url"),
  status: productStatus("status").notNull().default("draft"),
  featured: boolean("featured").notNull().default(false),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("product_status_updated_idx").on(table.status, table.updatedAt),
  index("product_featured_idx").on(table.featured),
]);

export const productCategory = pgTable("product_category", {
  productId: uuid("product_id").notNull().references(() => product.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => category.id, { onDelete: "cascade" }),
}, (table) => [
  uniqueIndex("product_category_unique").on(table.productId, table.categoryId),
  index("product_category_category_idx").on(table.categoryId),
]);

export const productVariant = pgTable("product_variant", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => product.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sku: text("sku"),
  attributes: jsonb("attributes").$type<Record<string, string>>().notNull().default({}),
  priceOverride: numeric("price_override", { precision: 16, scale: 0 }),
  tiktokUrlOverride: text("tiktok_url_override"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("product_variant_product_idx").on(table.productId)]);

export const productMedia = pgTable("product_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => product.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => productVariant.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  alt: text("alt").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("product_media_product_idx").on(table.productId)]);

export const invitation = pgTable("invitation", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  role: appRole("role").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  createdBy: text("created_by").notNull().references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("invitation_email_idx").on(table.email)]);

export const catalogEvent = pgTable("catalog_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => product.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => productVariant.id, { onDelete: "set null" }),
  eventType: catalogEventType("event_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("catalog_event_product_type_idx").on(table.productId, table.eventType),
  index("catalog_event_created_idx").on(table.createdAt),
]);
