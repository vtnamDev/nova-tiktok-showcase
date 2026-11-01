# NOVA TikTok Showcase

Multi-category TikTok Shop catalog and admin CMS.

## Stack
- TanStack Start + React + TypeScript
- Vercel Functions (Nitro adapter)
- Neon PostgreSQL + Drizzle ORM
- Better Auth: username/password and Google OAuth
- Vercel Blob for public product media

Customers browse without accounts. The site does not take payments or provide a cart; the chosen product/variant sends the customer to TikTok Shop.

## Local development
1. Copy .env.example to .env.
2. Set pooled Neon connection as DATABASE_URL and direct connection as DATABASE_URL_UNPOOLED (the direct variable is used by Drizzle migrations).
3. Set BETTER_AUTH_SECRET to a random secret of at least 32 characters.
4. Set BETTER_AUTH_URL=http://localhost:3000.
5. Configure Google OAuth and the exact bootstrap email if you will create the first Owner.
6. Run:

```bash
npm install
npm run db:migrate
npm run dev
```

## Vercel
1. Connect the GitHub repository to the Vercel project.
2. Connect a Neon Postgres resource to Preview and Production. Use Singapore region sin1 to keep the database near the app's Functions.
3. Ensure these environment variables are present in Vercel: DATABASE_URL, DATABASE_URL_UNPOOLED, BETTER_AUTH_SECRET, BETTER_AUTH_URL, BOOTSTRAP_OWNER_EMAIL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BLOB_READ_WRITE_TOKEN.
4. The Vercel Blob store nova-product-media is created for this project. Its token is managed by Vercel; do not copy it into Git.
5. Set the Google OAuth callback to https://YOUR_DOMAIN/api/auth/callback/google.
6. After connecting Neon, redeploy the Preview. Apply npm run db:migrate using the direct connection string, then test sign-in, invitations, roles, products and TikTok redirects before production promotion.

Never commit .env, database URLs, OAuth secrets or Blob tokens. Never expose secrets with a VITE_ prefix.

## First Owner bootstrap
The first account is restricted to BOOTSTRAP_OWNER_EMAIL and a Google OAuth identity whose provider reports a verified email. After that account signs in, manually assign Owner once in Neon SQL:

```sql
INSERT INTO user_role (user_id, role)
SELECT id, 'owner'::app_role
FROM "user"
WHERE lower(email) = lower('YOUR_VERIFIED_OWNER_EMAIL')
  AND email_verified = true
ON CONFLICT (user_id) DO UPDATE SET role = 'owner';
```

No public endpoint can promote an account. After an Owner exists, every new account must use an unexpired invitation created by an Owner. Invitation links expire after seven days.

## Roles
- Owner: full access; invites members and assigns roles.
- Admin: manages products, categories, variants and media.
- Editor: creates and edits product content.
- Viewer: read-only access.

Authorization is checked in server functions, not only by hiding UI controls.

## Catalog model
- Categories are dynamic and managed by Owner/Admin.
- A product can belong to multiple categories.
- Each product has a base price and TikTok URL.
- Variants can override price or TikTok URL; a null override inherits from the parent product.
- Only published products and active categories are shown publicly.
- Product views and TikTok outbound clicks are counted without storing visitor identities.
