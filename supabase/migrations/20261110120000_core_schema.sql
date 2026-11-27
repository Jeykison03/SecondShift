-- =====================================================================
-- SecondShift · 0001 · Core schema
-- Tables, types, helper functions, triggers, views, RPCs.
-- RLS policies live in 20261110120100_rls_policies.sql
-- Storage buckets live in 20261110120200_storage.sql
-- =====================================================================

-- Helper functions live in a schema that is NOT exposed by the REST API.
create schema if not exists private;

-- ---------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------
create type public.company_type as enum (
  'corporate', 'sme', 'startup', 'freelancer', 'nonprofit', 'education', 'public_sector'
);

create type public.company_size as enum ('1-10', '11-50', '51-200', '201-1000', '1000+');

create type public.member_role as enum ('owner', 'admin', 'member');

create type public.verification_status as enum ('unverified', 'pending', 'verified', 'rejected');

-- The 4 condition grades shown on every listing.
create type public.condition_grade as enum ('like_new', 'very_good', 'good', 'fair');
comment on type public.condition_grade is
  'like_new = no visible marks, fully working | very_good = minor marks, fully working | '
  'good = visible wear, fully working | fair = heavy wear or minor functional issue (described)';

create type public.listing_status as enum ('draft', 'active', 'reserved', 'sold', 'archived', 'removed');

create type public.usage_intensity as enum ('light', 'normal', 'heavy');

create type public.warranty_type as enum ('none', 'manufacturer', 'seller');

create type public.request_status as enum ('pending', 'accepted', 'declined', 'cancelled', 'completed');

create type public.pickup_status as enum ('proposed', 'confirmed', 'completed', 'cancelled', 'no_show');

create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create type public.wanted_status as enum ('open', 'fulfilled', 'closed');

-- ---------------------------------------------------------------------
-- Generic updated_at trigger
-- ---------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- =====================================================================
-- PEOPLE & COMPANIES
-- =====================================================================

-- One row per auth user (created automatically on sign-up).
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  full_name          text check (char_length(full_name) <= 120),
  job_title          text check (char_length(job_title) <= 120),
  phone              text check (char_length(phone) <= 40),
  avatar_path        text,                         -- avatars bucket: {user_id}/file
  preferred_language text not null default 'en',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Platform moderators (approve seller verification, handle reports).
create table public.platform_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- A company can sell, buy, or both. Only public-safe info lives here.
create table public.companies (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (char_length(name) between 2 and 120),
  legal_name          text check (char_length(legal_name) <= 200),
  company_type        public.company_type not null default 'sme',
  company_size        public.company_size,
  industry            text check (char_length(industry) <= 80),
  description         text check (char_length(description) <= 2000),
  website             text check (char_length(website) <= 200),
  logo_path           text,                        -- company-logos bucket: {company_id}/file
  contact_email       text check (char_length(contact_email) <= 200),
  contact_phone       text check (char_length(contact_phone) <= 40),
  street              text,
  postal_code         text,
  city                text,
  region              text,
  country_code        char(2) not null default 'DE',
  latitude            double precision check (latitude between -90 and 90),
  longitude           double precision check (longitude between -180 and 180),
  is_seller           boolean not null default false,
  is_buyer            boolean not null default true,
  verification_status public.verification_status not null default 'unverified',
  verified_at         timestamptz,
  created_by          uuid references auth.users (id) on delete set null default auth.uid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index companies_city_idx on public.companies (city);
create index companies_verification_idx on public.companies (verification_status);

-- Which users belong to which company (a user may belong to several).
create table public.company_members (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);
create index company_members_user_idx on public.company_members (user_id);

-- Invite a colleague by email; they accept via accept_company_invitation(token).
create table public.company_invitations (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  email       text not null check (char_length(email) <= 200),
  role        public.member_role not null default 'member' check (role <> 'owner'),
  token       uuid not null unique default gen_random_uuid(),
  invited_by  uuid references auth.users (id) on delete set null default auth.uid(),
  accepted_at timestamptz,
  expires_at  timestamptz not null default now() + interval '14 days',
  created_at  timestamptz not null default now()
);
create index company_invitations_company_idx on public.company_invitations (company_id);
create index company_invitations_email_idx on public.company_invitations (lower(email));

-- Seller verification submissions (private: registration data + documents).
-- Approval here drives the "verified seller" badge on companies.
create table public.seller_verifications (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies (id) on delete cascade,
  registration_number text check (char_length(registration_number) <= 60),  -- e.g. Handelsregister HRB
  vat_id              text check (char_length(vat_id) <= 30),
  document_type       text check (document_type in
                        ('trade_register_extract', 'business_registration', 'vat_certificate', 'other')),
  document_path       text,                        -- verification-docs bucket: {company_id}/file
  status              public.verification_status not null default 'pending'
                        check (status <> 'unverified'),
  submitted_by        uuid references auth.users (id) on delete set null default auth.uid(),
  reviewer_notes      text,
  reviewed_by         uuid references auth.users (id) on delete set null,
  reviewed_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index seller_verifications_company_idx on public.seller_verifications (company_id);
create index seller_verifications_status_idx on public.seller_verifications (status);

-- Where buyers collect items (pickup only in V1, no delivery).
create table public.pickup_locations (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  label         text not null check (char_length(label) <= 80),   -- "HQ loading dock"
  street        text not null,
  postal_code   text not null,
  city          text not null,
  country_code  char(2) not null default 'DE',
  latitude      double precision check (latitude between -90 and 90),
  longitude     double precision check (longitude between -180 and 180),
  opening_hours text check (char_length(opening_hours) <= 300),  -- "Mon–Fri 9:00–16:00"
  instructions  text check (char_length(instructions) <= 1000),  -- "Ring at gate B"
  is_default    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index pickup_locations_company_idx on public.pickup_locations (company_id);
create unique index pickup_locations_one_default
  on public.pickup_locations (company_id) where is_default;

-- =====================================================================
-- CATALOG & LISTINGS
-- =====================================================================

-- spec_schema describes the category-specific fields the listing form shows,
-- e.g. [{"key":"ram_gb","label":"RAM","type":"number","unit":"GB","required":true}]
create table public.categories (
  id          bigint generated by default as identity primary key,
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name        text not null,
  parent_id   bigint references public.categories (id) on delete set null,
  icon        text,
  sort_order  int not null default 0,
  spec_schema jsonb not null default '[]'::jsonb check (jsonb_typeof(spec_schema) = 'array'),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.listings (
  id                         uuid primary key default gen_random_uuid(),
  company_id                 uuid not null references public.companies (id) on delete cascade,
  created_by                 uuid references auth.users (id) on delete set null default auth.uid(),
  category_id                bigint not null references public.categories (id),

  -- What it is
  title                      text not null check (char_length(title) between 3 and 140),
  description                text check (char_length(description) <= 5000),
  brand                      text check (char_length(brand) <= 60),
  model                      text check (char_length(model) <= 120),
  release_year               smallint check (release_year between 1990 and 2100),
  specs                      jsonb not null default '{}'::jsonb check (jsonb_typeof(specs) = 'object'),

  -- Condition
  condition_grade            public.condition_grade not null,
  condition_notes            text check (char_length(condition_notes) <= 2000),
  cosmetic_defects           text check (char_length(cosmetic_defects) <= 1000),
  functional_defects         text check (char_length(functional_defects) <= 1000),

  -- Quantity (bulk listings)
  quantity_total             int not null default 1 check (quantity_total > 0),
  quantity_available         int not null default 1 check (quantity_available >= 0),
  min_order_quantity         int not null default 1 check (min_order_quantity >= 1),

  -- Price (integer cents, no floating point money)
  unit_price_cents           int not null check (unit_price_cents >= 0),
  original_price_cents       int check (original_price_cents >= 0),  -- new price, for "x% cheaper than new"
  currency                   char(3) not null default 'EUR',
  price_includes_vat         boolean not null default true,
  price_negotiable           boolean not null default false,

  -- Usage history
  purchased_on               date,
  usage_months               int check (usage_months >= 0),
  usage_intensity            public.usage_intensity,
  battery_health_pct         smallint check (battery_health_pct between 0 and 100),
  accessories_included       text[] not null default '{}',   -- {"charger","dock","original box"}
  original_packaging         boolean not null default false,

  -- Warranty & returns
  warranty_type              public.warranty_type not null default 'none',
  warranty_until             date,
  warranty_notes             text check (char_length(warranty_notes) <= 1000),
  returns_accepted           boolean not null default false,
  return_window_days         smallint check (return_window_days between 0 and 365),
  return_conditions          text check (char_length(return_conditions) <= 1000),

  -- Seller confirmations (required before publishing)
  data_wiped_confirmed       boolean not null default false,
  data_wipe_method           text check (char_length(data_wipe_method) <= 120),  -- "NIST 800-88 purge", "factory reset"
  data_wipe_certificate_path text,                  -- wipe-certificates bucket: {company_id}/{listing_id}/file
  ownership_confirmed        boolean not null default false,
  confirmed_at               timestamptz,
  confirmed_by               uuid references auth.users (id) on delete set null,

  -- Pickup
  pickup_location_id         uuid references public.pickup_locations (id) on delete set null,
  pickup_notes               text check (char_length(pickup_notes) <= 1000),

  -- Lifecycle
  status                     public.listing_status not null default 'draft',
  published_at               timestamptz,
  sold_at                    timestamptz,
  view_count                 int not null default 0,

  search tsvector generated always as (
    setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(brand, '') || ' ' || coalesce(model, '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(description, '')), 'C')
  ) stored,

  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),

  constraint listings_quantity_check  check (quantity_available <= quantity_total),
  constraint listings_min_order_check check (min_order_quantity <= quantity_total),
  constraint listings_returns_check   check (not returns_accepted or return_window_days is not null),
  constraint listings_warranty_check  check (warranty_type = 'none' or warranty_until is not null),
  -- A listing can only be public once the seller confirmed data wipe + ownership.
  constraint listings_publish_requirements check (
    status in ('draft', 'archived', 'removed') or (data_wiped_confirmed and ownership_confirmed)
  )
);
create index listings_company_idx  on public.listings (company_id);
create index listings_category_idx on public.listings (category_id);
create index listings_status_idx   on public.listings (status, published_at desc);
create index listings_price_idx    on public.listings (unit_price_cents);
create index listings_search_idx   on public.listings using gin (search);
create index listings_specs_idx    on public.listings using gin (specs jsonb_path_ops);

-- Bulk discounts: "from 10 units: 180 €/unit".
create table public.listing_price_tiers (
  id               uuid primary key default gen_random_uuid(),
  listing_id       uuid not null references public.listings (id) on delete cascade,
  min_quantity     int not null check (min_quantity > 1),
  unit_price_cents int not null check (unit_price_cents >= 0),
  unique (listing_id, min_quantity)
);

create table public.listing_photos (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references public.listings (id) on delete cascade,
  storage_path text not null,                     -- listing-photos bucket: {company_id}/{listing_id}/file
  position     smallint not null default 0,
  caption      text check (char_length(caption) <= 200),
  is_cover     boolean not null default false,
  width        int,
  height       int,
  created_at   timestamptz not null default now()
);
create index listing_photos_listing_idx on public.listing_photos (listing_id, position);
create unique index listing_photos_one_cover on public.listing_photos (listing_id) where is_cover;

-- Buyer saves listings.
create table public.favorites (
  user_id    uuid not null references auth.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index favorites_listing_idx on public.favorites (listing_id);

-- Buyer side: "We need 10 laptops, max 300 € each" — sellers can respond.
create table public.wanted_requests (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete cascade,
  created_by            uuid references auth.users (id) on delete set null default auth.uid(),
  category_id           bigint references public.categories (id),
  title                 text not null check (char_length(title) between 3 and 140),
  description           text check (char_length(description) <= 3000),
  quantity              int not null default 1 check (quantity > 0),
  max_unit_price_cents  int check (max_unit_price_cents >= 0),
  min_condition_grade   public.condition_grade,
  needed_by             date,
  city                  text,
  status                public.wanted_status not null default 'open',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index wanted_requests_status_idx on public.wanted_requests (status, created_at desc);
create index wanted_requests_company_idx on public.wanted_requests (company_id);

-- =====================================================================
-- MESSAGING, REQUESTS, PICKUP
-- =====================================================================

-- A conversation is between a buyer company and a seller company,
-- about a listing OR a wanted request.
create table public.conversations (
  id                uuid primary key default gen_random_uuid(),
  listing_id        uuid references public.listings (id) on delete set null,
  wanted_request_id uuid references public.wanted_requests (id) on delete set null,
  buyer_company_id  uuid not null references public.companies (id) on delete cascade,
  seller_company_id uuid not null references public.companies (id) on delete cascade,
  started_by        uuid references auth.users (id) on delete set null default auth.uid(),
  last_message_at   timestamptz,
  created_at        timestamptz not null default now(),
  constraint conversations_parties_check check (buyer_company_id <> seller_company_id),
  unique (listing_id, buyer_company_id),
  unique (wanted_request_id, seller_company_id)
);
create index conversations_buyer_idx  on public.conversations (buyer_company_id, last_message_at desc);
create index conversations_seller_idx on public.conversations (seller_company_id, last_message_at desc);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid references auth.users (id) on delete set null default auth.uid(),
  body            text check (char_length(body) <= 5000),
  attachment_path text,                           -- message-attachments bucket: {conversation_id}/file
  read_at         timestamptz,
  created_at      timestamptz not null default now(),
  constraint messages_content_check check (body is not null or attachment_path is not null)
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- Buyer asks to buy N units (no online payment in V1 — paid at pickup / by invoice).
create table public.purchase_requests (
  id                      uuid primary key default gen_random_uuid(),
  listing_id              uuid not null references public.listings (id) on delete cascade,
  conversation_id         uuid references public.conversations (id) on delete set null,
  buyer_company_id        uuid not null references public.companies (id) on delete cascade,
  seller_company_id       uuid not null references public.companies (id) on delete cascade,  -- set by trigger
  requested_by            uuid references auth.users (id) on delete set null default auth.uid(),
  quantity                int not null check (quantity > 0),
  offered_unit_price_cents int check (offered_unit_price_cents >= 0),  -- null = asking price
  message                 text check (char_length(message) <= 2000),
  status                  public.request_status not null default 'pending',
  responded_at            timestamptz,
  completed_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index purchase_requests_listing_idx on public.purchase_requests (listing_id, status);
create index purchase_requests_buyer_idx   on public.purchase_requests (buyer_company_id, created_at desc);
create index purchase_requests_seller_idx  on public.purchase_requests (seller_company_id, created_at desc);

-- Pickup appointment for an accepted request.
create table public.pickups (
  id                  uuid primary key default gen_random_uuid(),
  purchase_request_id uuid not null references public.purchase_requests (id) on delete cascade,
  pickup_location_id  uuid references public.pickup_locations (id) on delete set null,
  scheduled_for       timestamptz not null,
  status              public.pickup_status not null default 'proposed',
  proposed_by         uuid references auth.users (id) on delete set null default auth.uid(),
  notes               text check (char_length(notes) <= 1000),
  confirmed_at        timestamptz,
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index pickups_request_idx on public.pickups (purchase_request_id);
create index pickups_scheduled_idx on public.pickups (scheduled_for);

-- =====================================================================
-- TRUST & SAFETY
-- =====================================================================

-- After a completed deal both sides may review each other.
create table public.reviews (
  id                  uuid primary key default gen_random_uuid(),
  purchase_request_id uuid not null references public.purchase_requests (id) on delete cascade,
  reviewer_company_id uuid not null references public.companies (id) on delete cascade,
  reviewed_company_id uuid not null references public.companies (id) on delete cascade,
  author_id           uuid references auth.users (id) on delete set null default auth.uid(),
  rating              smallint not null check (rating between 1 and 5),
  comment             text check (char_length(comment) <= 2000),
  created_at          timestamptz not null default now(),
  unique (purchase_request_id, reviewer_company_id),
  constraint reviews_parties_check check (reviewer_company_id <> reviewed_company_id)
);
create index reviews_reviewed_idx on public.reviews (reviewed_company_id);

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users (id) on delete set null default auth.uid(),
  listing_id  uuid references public.listings (id) on delete cascade,
  company_id  uuid references public.companies (id) on delete cascade,
  reason      text not null check (reason in
                ('fraud', 'stolen_goods', 'misleading', 'data_not_wiped', 'spam', 'inappropriate', 'other')),
  details     text check (char_length(details) <= 2000),
  status      public.report_status not null default 'open',
  admin_notes text,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  constraint reports_target_check check (listing_id is not null or company_id is not null)
);
create index reports_status_idx on public.reports (status, created_at);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  type       text not null,          -- new_message, new_request, request_accepted, ...
  title      text not null,
  body       text,
  link       text,                   -- in-app route, e.g. /messages/<id>
  data       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- =====================================================================
-- HELPER FUNCTIONS (used by RLS policies; security definer so they can
-- read membership tables without recursive RLS)
-- =====================================================================

create or replace function private.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_admins where user_id = (select auth.uid()));
$$;

create or replace function private.is_company_member(p_company_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = (select auth.uid())
  );
$$;

create or replace function private.is_company_admin(p_company_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = (select auth.uid()) and role in ('owner', 'admin')
  );
$$;

create or replace function private.is_company_owner(p_company_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = (select auth.uid()) and role = 'owner'
  );
$$;

-- Text variants for storage paths (folder names are text; avoids uuid cast errors).
create or replace function private.is_company_member_path(p_folder text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.company_members
    where company_id::text = p_folder and user_id = (select auth.uid())
  );
$$;

create or replace function private.is_company_admin_path(p_folder text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.company_members
    where company_id::text = p_folder and user_id = (select auth.uid()) and role in ('owner', 'admin')
  );
$$;

create or replace function private.can_view_listing(p_listing_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.listings l
    where l.id = p_listing_id
      and (l.status in ('active', 'reserved', 'sold')
           or private.is_company_member(l.company_id)
           or private.is_platform_admin())
  );
$$;

create or replace function private.can_edit_listing(p_listing_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.listings l
    where l.id = p_listing_id and private.is_company_member(l.company_id)
  );
$$;

create or replace function private.is_conversation_participant(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and (private.is_company_member(c.buyer_company_id) or private.is_company_member(c.seller_company_id))
  );
$$;

create or replace function private.is_conversation_participant_path(p_folder text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversations c
    where c.id::text = p_folder
      and (private.is_company_member(c.buyer_company_id) or private.is_company_member(c.seller_company_id))
  );
$$;

create or replace function private.is_request_participant(p_request_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.purchase_requests r
    where r.id = p_request_id
      and (private.is_company_member(r.buyer_company_id) or private.is_company_member(r.seller_company_id))
  );
$$;

create or replace function private.can_review(p_request_id uuid, p_reviewer uuid, p_reviewed uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_company_member(p_reviewer) and exists (
    select 1 from public.purchase_requests r
    where r.id = p_request_id
      and r.status = 'completed'
      and ((r.buyer_company_id = p_reviewer and r.seller_company_id = p_reviewed)
        or (r.seller_company_id = p_reviewer and r.buyer_company_id = p_reviewed))
  );
$$;

-- Send a notification to every member of a company (optionally skipping one user).
create or replace function private.notify_company(
  p_company_id uuid, p_type text, p_title text, p_body text, p_link text,
  p_data jsonb default '{}'::jsonb, p_exclude_user uuid default null
) returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, type, title, body, link, data)
  select m.user_id, p_type, p_title, p_body, p_link, p_data
  from public.company_members m
  where m.company_id = p_company_id
    and (p_exclude_user is null or m.user_id <> p_exclude_user);
$$;

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- updated_at on every table that has it
create trigger set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.companies
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.seller_verifications
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.pickup_locations
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.listings
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.wanted_requests
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.purchase_requests
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.pickups
  for each row execute function private.set_updated_at();

-- New auth user -> profile row
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Company creator becomes owner
create or replace function private.add_company_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.created_by is not null then
    insert into public.company_members (company_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict do nothing;
  end if;
  return new;
end $$;

create trigger add_company_owner
  after insert on public.companies
  for each row execute function private.add_company_owner();

-- Only platform admins (or internal security-definer code) may change the verified badge.
create or replace function private.guard_company_verification()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') and not private.is_platform_admin() then
    if tg_op = 'INSERT' then
      new.verification_status := 'unverified';
      new.verified_at := null;
    else
      new.verification_status := old.verification_status;
      new.verified_at := old.verified_at;
      new.created_by := old.created_by;
    end if;
  end if;
  return new;
end $$;

create trigger guard_company_verification
  before insert or update on public.companies
  for each row execute function private.guard_company_verification();

-- Verification submission / review -> company badge
create or replace function private.sync_company_verification()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status and new.status in ('verified', 'rejected') then
    new.reviewed_by := coalesce(new.reviewed_by, auth.uid());
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;

  update public.companies c
     set verification_status = new.status,
         verified_at = case when new.status = 'verified' then now() else null end
   where c.id = new.company_id
     -- a new pending submission does not remove an existing badge
     and not (new.status = 'pending' and c.verification_status = 'verified');

  if tg_op = 'UPDATE' and new.status is distinct from old.status and new.status in ('verified', 'rejected') then
    perform private.notify_company(
      new.company_id,
      'verification_' || new.status::text,
      case when new.status = 'verified' then 'Your company is now a verified seller'
           else 'Your verification was rejected' end,
      new.reviewer_notes, '/company/verification');
  end if;
  return new;
end $$;

create trigger sync_company_verification
  before insert or update of status on public.seller_verifications
  for each row execute function private.sync_company_verification();

-- Listing housekeeping: confirmation stamps, publish/sold timestamps, protected columns.
create or replace function private.prepare_listing()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.data_wiped_confirmed and new.ownership_confirmed then
    if tg_op = 'INSERT' or not (old.data_wiped_confirmed and old.ownership_confirmed) then
      new.confirmed_at := now();
      new.confirmed_by := auth.uid();
    end if;
  else
    new.confirmed_at := null;
    new.confirmed_by := null;
  end if;

  if new.status = 'active' and new.published_at is null then
    new.published_at := now();
  end if;
  if new.status = 'sold' and new.sold_at is null then
    new.sold_at := now();
  end if;

  if new.pickup_location_id is not null and not exists (
    select 1 from public.pickup_locations p
    where p.id = new.pickup_location_id and p.company_id = new.company_id
  ) then
    raise exception 'Pickup location must belong to the selling company';
  end if;

  if tg_op = 'UPDATE' and current_user in ('anon', 'authenticated') then
    new.company_id := old.company_id;
    new.view_count := old.view_count;
    new.created_by := old.created_by;
  end if;
  return new;
end $$;

create trigger prepare_listing
  before insert or update on public.listings
  for each row execute function private.prepare_listing();

-- Mark company as seller once it lists something
create or replace function private.mark_company_seller()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.companies set is_seller = true where id = new.company_id and not is_seller;
  return new;
end $$;

create trigger mark_company_seller
  after insert on public.listings
  for each row execute function private.mark_company_seller();

-- Conversations: derive the counter-party from the listing / wanted request
create or replace function private.prepare_conversation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_company uuid;
begin
  if new.listing_id is not null then
    select company_id into v_company from public.listings
    where id = new.listing_id and status in ('active', 'reserved');
    if v_company is null then
      raise exception 'Listing is not available';
    end if;
    new.seller_company_id := v_company;
  elsif new.wanted_request_id is not null then
    select company_id into v_company from public.wanted_requests
    where id = new.wanted_request_id and status = 'open';
    if v_company is null then
      raise exception 'Wanted request is not open';
    end if;
    new.buyer_company_id := v_company;
  else
    raise exception 'A conversation needs a listing or a wanted request';
  end if;
  new.started_by := coalesce(auth.uid(), new.started_by);
  return new;
end $$;

create trigger prepare_conversation
  before insert on public.conversations
  for each row execute function private.prepare_conversation();

-- New message: bump conversation + notify the other company
create or replace function private.on_new_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_conv   public.conversations;
  v_target uuid;
begin
  update public.conversations set last_message_at = new.created_at
  where id = new.conversation_id
  returning * into v_conv;

  if exists (select 1 from public.company_members
             where company_id = v_conv.buyer_company_id and user_id = new.sender_id) then
    v_target := v_conv.seller_company_id;
  else
    v_target := v_conv.buyer_company_id;
  end if;

  perform private.notify_company(
    v_target, 'new_message', 'New message',
    left(coalesce(new.body, 'Sent an attachment'), 140),
    '/messages/' || new.conversation_id,
    jsonb_build_object('conversation_id', new.conversation_id, 'message_id', new.id),
    new.sender_id);
  return new;
end $$;

create trigger on_new_message
  after insert on public.messages
  for each row execute function private.on_new_message();

-- Purchase requests: validation, allowed status changes, stock reservation, notifications
create or replace function private.handle_purchase_request()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_listing   public.listings;
  v_uid       uuid := auth.uid();
  v_is_buyer  boolean;
  v_is_seller boolean;
begin
  select * into v_listing from public.listings where id = new.listing_id for update;
  if v_listing.id is null then
    raise exception 'Listing not found';
  end if;

  -- ---------- INSERT ----------
  if tg_op = 'INSERT' then
    if v_listing.status <> 'active' then
      raise exception 'Listing is not available';
    end if;
    if new.buyer_company_id = v_listing.company_id then
      raise exception 'You cannot buy your own listing';
    end if;
    if new.quantity < v_listing.min_order_quantity then
      raise exception 'Minimum order quantity is %', v_listing.min_order_quantity;
    end if;
    if new.quantity > v_listing.quantity_available then
      raise exception 'Only % unit(s) available', v_listing.quantity_available;
    end if;
    new.status := 'pending';
    new.seller_company_id := v_listing.company_id;
    new.requested_by := coalesce(v_uid, new.requested_by);
    new.responded_at := null;
    new.completed_at := null;

    perform private.notify_company(
      new.seller_company_id, 'new_request', 'New purchase request',
      new.quantity || ' × ' || v_listing.title, '/requests/' || new.id,
      jsonb_build_object('purchase_request_id', new.id, 'listing_id', new.listing_id));
    return new;
  end if;

  -- ---------- UPDATE ----------
  -- immutable columns
  new.listing_id        := old.listing_id;
  new.buyer_company_id  := old.buyer_company_id;
  new.seller_company_id := old.seller_company_id;
  new.requested_by      := old.requested_by;
  if old.status <> 'pending' then
    new.quantity := old.quantity;
    new.offered_unit_price_cents := old.offered_unit_price_cents;
  end if;

  if new.status = old.status then
    return new;
  end if;

  -- permission per transition (skipped for service role / SQL editor where auth.uid() is null)
  if v_uid is not null then
    v_is_buyer  := private.is_company_member(old.buyer_company_id);
    v_is_seller := private.is_company_member(old.seller_company_id);
    if not (
         (old.status = 'pending'  and new.status in ('accepted', 'declined') and v_is_seller)
      or (old.status = 'pending'  and new.status = 'cancelled' and v_is_buyer)
      or (old.status = 'accepted' and new.status = 'cancelled' and (v_is_buyer or v_is_seller))
      or (old.status = 'accepted' and new.status = 'completed' and (v_is_buyer or v_is_seller))
    ) then
      raise exception 'Not allowed to change request from % to %', old.status, new.status;
    end if;
  end if;

  if new.status in ('accepted', 'declined') then
    new.responded_at := now();
  end if;

  -- stock: reserve on accept, release on cancel, close on complete
  if new.status = 'accepted' then
    if v_listing.quantity_available < new.quantity then
      raise exception 'Only % unit(s) still available', v_listing.quantity_available;
    end if;
    update public.listings
       set quantity_available = quantity_available - new.quantity,
           status = case when quantity_available - new.quantity = 0 then 'reserved'::public.listing_status
                         else status end
     where id = new.listing_id;

  elsif old.status = 'accepted' and new.status = 'cancelled' then
    update public.listings
       set quantity_available = quantity_available + old.quantity,
           status = case when status = 'reserved' then 'active'::public.listing_status else status end
     where id = new.listing_id;

  elsif new.status = 'completed' then
    new.completed_at := now();
    update public.listings
       set status = 'sold'
     where id = new.listing_id
       and quantity_available = 0
       and status = 'reserved'
       and not exists (
         select 1 from public.purchase_requests r
         where r.listing_id = new.listing_id and r.status = 'accepted' and r.id <> new.id);
  end if;

  -- notify the other side
  perform private.notify_company(
    case when v_uid is not null and private.is_company_member(old.seller_company_id)
         then old.buyer_company_id else old.seller_company_id end,
    'request_' || new.status::text,
    'Purchase request ' || new.status::text,
    v_listing.title, '/requests/' || new.id,
    jsonb_build_object('purchase_request_id', new.id, 'listing_id', new.listing_id),
    v_uid);
  return new;
end $$;

create trigger handle_purchase_request
  before insert or update on public.purchase_requests
  for each row execute function private.handle_purchase_request();

-- Pickups: only for accepted requests; timestamps; completing pickup completes the request
create or replace function private.handle_pickup()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_status public.request_status;
begin
  select status into v_status from public.purchase_requests where id = new.purchase_request_id;

  if tg_op = 'INSERT' then
    if v_status is distinct from 'accepted' then
      raise exception 'Pickups can only be scheduled for accepted requests';
    end if;
    new.proposed_by := coalesce(auth.uid(), new.proposed_by);
    return new;
  end if;

  new.purchase_request_id := old.purchase_request_id;
  if new.status = 'confirmed' and old.status <> 'confirmed' then
    new.confirmed_at := now();
  end if;
  if new.status = 'completed' and old.status <> 'completed' then
    new.completed_at := now();
    if v_status = 'accepted' then
      update public.purchase_requests set status = 'completed' where id = new.purchase_request_id;
    end if;
  end if;
  return new;
end $$;

create trigger handle_pickup
  before insert or update on public.pickups
  for each row execute function private.handle_pickup();

-- =====================================================================
-- VIEWS (security_invoker = RLS of the caller applies)
-- =====================================================================

-- Card data for the browse/search page.
create view public.listing_cards with (security_invoker = true) as
select
  l.id,
  l.title,
  l.brand,
  l.model,
  l.condition_grade,
  l.unit_price_cents,
  l.original_price_cents,
  l.currency,
  l.price_includes_vat,
  l.price_negotiable,
  l.quantity_available,
  l.min_order_quantity,
  l.warranty_type,
  l.returns_accepted,
  l.status,
  l.published_at,
  l.search,
  l.specs,
  l.category_id,
  cat.slug  as category_slug,
  cat.name  as category_name,
  co.id     as company_id,
  co.name   as company_name,
  co.city   as company_city,
  (co.verification_status = 'verified') as seller_verified,
  (select p.storage_path from public.listing_photos p
    where p.listing_id = l.id
    order by p.is_cover desc, p.position
    limit 1) as cover_photo_path
from public.listings l
join public.categories cat on cat.id = l.category_id
join public.companies  co  on co.id  = l.company_id;

-- Average rating per company.
create view public.company_ratings with (security_invoker = true) as
select reviewed_company_id as company_id,
       round(avg(rating)::numeric, 2) as avg_rating,
       count(*)::int as review_count
from public.reviews
group by reviewed_company_id;

-- =====================================================================
-- RPC FUNCTIONS (callable from the frontend via supabase.rpc())
-- =====================================================================

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_conversation_participant(p_conversation_id) then
    raise exception 'Not a participant';
  end if;
  update public.messages
     set read_at = now()
   where conversation_id = p_conversation_id
     and read_at is null
     and sender_id is distinct from auth.uid();
end $$;

create or replace function public.increment_listing_view(p_listing_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.listings set view_count = view_count + 1
  where id = p_listing_id and status in ('active', 'reserved');
$$;

create or replace function public.accept_company_invitation(p_token uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.company_invitations;
begin
  select * into v_inv from public.company_invitations
  where token = p_token and accepted_at is null and expires_at > now();
  if v_inv.id is null then
    raise exception 'Invitation is invalid or expired';
  end if;
  if lower(v_inv.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'This invitation was sent to a different email address';
  end if;
  insert into public.company_members (company_id, user_id, role)
  values (v_inv.company_id, auth.uid(), v_inv.role)
  on conflict (company_id, user_id) do nothing;
  update public.company_invitations set accepted_at = now() where id = v_inv.id;
  return v_inv.company_id;
end $$;

revoke execute on function public.mark_conversation_read(uuid) from public, anon;
revoke execute on function public.accept_company_invitation(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.accept_company_invitation(uuid) to authenticated;
grant execute on function public.increment_listing_view(uuid) to anon, authenticated;
