# NOVA TikTok Showcase

Storefront and lightweight CMS for a multi-category TikTok Shop catalog.

## Architecture

- **Frontend + backend:** TanStack Start, React, TypeScript, deployed on Vercel.
- **Runtime:** Nitro builds the TanStack Start server into Vercel Functions.
- **Database:** Neon PostgreSQL using Drizzle ORM and Neon Serverless Pool.
- **Authentication:** Better Auth (username/password + Google OAuth).
- **Image storage:** Vercel Blob.
- **Commerce:** The site does not collect payment. Each selected product/variant sends the customer to its TikTok Shop URL.

## Local setup

1. Copy `.env.example` to `.env`.
2. Create a Neon PostgreSQL database and set `DATABASE_URL` to its pooled connection string.
3. Set `BETTER_AUTH_SECRET` to a random value with at least 32 characters.
4. Set `BETTER_AUTH_URL=http://localhost:3000`.
5. Set `BOOTSTRAP_OWNER_EMAIL` to the email address that will become the first Owner.
6. Optionally configure Google OAuth and Vercel Blob values.
7. Install and start:

```bash
npm install
npm run db:migrate
npm run dev
```

## Vercel setup

1. Import this repository into Vercel (the project is already linked to this repository).
2. Add a Neon Postgres resource and ensure the project receives `DATABASE_URL`.
3. Add environment variables in **Vercel → Project → Settings → Environment Variables**:
   - `DATABASE_URL`
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL` (the final production origin)
   - `BOOTSTRAP_OWNER_EMAIL`
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
   - `BLOB_READ_WRITE_TOKEN`
4. Create a Vercel Blob store and connect it to the project.
5. Configure the Google OAuth callback URL as `https://YOUR_DOMAIN/api/auth/callback/google`.
6. Deploy a Preview first, confirm sign-in and catalog reads, then promote to Production.

Never prefix private values with `VITE_`. Never commit `.env` files.

## First Owner bootstrap

Only the exact email in `BOOTSTRAP_OWNER_EMAIL` can create the first account before an Owner exists. After that account signs in successfully, manually promote the verified account once in Neon SQL:

```sql
INSERT INTO user_role (user_id, role)
SELECT id, 'owner'::app_role
FROM "user"
WHERE lower(email) = lower('YOUR_VERIFIED_OWNER_EMAIL')
ON CONFLICT (user_id) DO UPDATE SET role = 'owner';
```

After the first Owner exists, all new accounts require an unexpired invitation token created by an Owner. The Owner shares the one-time invitation URL with the intended email address. Invitation links expire after seven days.

## Roles

- **Owner:** full access, team invitations and role assignment.
- **Admin:** manage products, categories, variants and images.
- **Editor:** create and edit products.
- **Viewer:** read-only access.

Permissions are checked in server functions. UI visibility is not an authorization boundary.

## Product model

- Products can belong to multiple categories.
- Each product has a base price and base TikTok URL.
- Variants can override the base price and/or TikTok URL; empty override values inherit from the parent product.
- Product images are stored as media records; upload endpoint uses Vercel Blob.
- Only products with status `published` are returned by the public catalog.

## Migrations

SQL migrations live in `drizzle/migrations`. Apply them with `npm run db:migrate`. Use `npm run db:generate` after changing the Drizzle schema.

## Important migration note

This upgrade replaces the old Supabase/Lovable Cloud authentication and data path. No Supabase credentials or service-role keys are required by this codebase.
