CREATE TYPE app_role AS ENUM ('owner', 'admin', 'editor', 'viewer');
CREATE TYPE product_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE catalog_event_type AS ENUM ('view', 'tiktok_click');

CREATE TABLE "user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  username text UNIQUE,
  display_username text,
  invite_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE session (
  id text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX session_user_idx ON session(user_id);

CREATE TABLE account (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX account_user_idx ON account(user_id);

CREATE TABLE verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verification_identifier_idx ON verification(identifier);

CREATE TABLE user_role (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'viewer',
  assigned_by text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE category (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE product (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  base_price numeric(16,0) NOT NULL DEFAULT 0,
  base_tiktok_url text,
  status product_status NOT NULL DEFAULT 'draft',
  featured boolean NOT NULL DEFAULT false,
  created_by text REFERENCES "user"(id) ON DELETE SET NULL,
  updated_by text REFERENCES "user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_status_updated_idx ON product(status, updated_at);
CREATE INDEX product_featured_idx ON product(featured);

CREATE TABLE product_category (
  product_id uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES category(id) ON DELETE CASCADE,
  CONSTRAINT product_category_unique UNIQUE(product_id, category_id)
);
CREATE INDEX product_category_category_idx ON product_category(category_id);

CREATE TABLE product_variant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  price_override numeric(16,0),
  tiktok_url_override text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_variant_product_idx ON product_variant(product_id);

CREATE TABLE product_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variant(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_media_product_idx ON product_media(product_id);

CREATE TABLE invitation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role app_role NOT NULL,
  token_hash text NOT NULL UNIQUE,
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invitation_email_idx ON invitation(email);

CREATE TABLE catalog_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variant(id) ON DELETE SET NULL,
  event_type catalog_event_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX catalog_event_product_type_idx ON catalog_event(product_id, event_type);
CREATE INDEX catalog_event_created_idx ON catalog_event(created_at);
