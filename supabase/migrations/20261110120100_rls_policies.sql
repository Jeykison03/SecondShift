-- =====================================================================
-- SecondShift · 0002 · Row Level Security
-- Every table has RLS enabled. Anonymous visitors (GitHub Pages demo)
-- can browse public listings; everything else needs a signed-in user.
-- =====================================================================

grant usage on schema private to anon, authenticated;
grant execute on all functions in schema private to anon, authenticated;

alter table public.profiles             enable row level security;
alter table public.platform_admins      enable row level security;
alter table public.companies            enable row level security;
alter table public.company_members      enable row level security;
alter table public.company_invitations  enable row level security;
alter table public.seller_verifications enable row level security;
alter table public.pickup_locations     enable row level security;
alter table public.categories           enable row level security;
alter table public.listings             enable row level security;
alter table public.listing_price_tiers  enable row level security;
alter table public.listing_photos       enable row level security;
alter table public.favorites            enable row level security;
alter table public.wanted_requests      enable row level security;
alter table public.conversations        enable row level security;
alter table public.messages             enable row level security;
alter table public.purchase_requests    enable row level security;
alter table public.pickups              enable row level security;
alter table public.reviews              enable row level security;
alter table public.reports              enable row level security;
alter table public.notifications        enable row level security;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create policy "profiles: signed-in users can read"
  on public.profiles for select to authenticated using (true);

create policy "profiles: users update their own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- platform_admins (managed from the dashboard / SQL editor only)
-- ---------------------------------------------------------------------
create policy "platform_admins: see own row"
  on public.platform_admins for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------
create policy "companies: public read"
  on public.companies for select to anon, authenticated using (true);

create policy "companies: signed-in users can create"
  on public.companies for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "companies: admins update"
  on public.companies for update to authenticated
  using (private.is_company_admin(id) or private.is_platform_admin())
  with check (private.is_company_admin(id) or private.is_platform_admin());

create policy "companies: owners delete"
  on public.companies for delete to authenticated
  using (private.is_company_owner(id) or private.is_platform_admin());

-- ---------------------------------------------------------------------
-- company_members
-- ---------------------------------------------------------------------
create policy "company_members: members see their team"
  on public.company_members for select to authenticated
  using (user_id = (select auth.uid()) or private.is_company_member(company_id));

create policy "company_members: admins add"
  on public.company_members for insert to authenticated
  with check (private.is_company_admin(company_id)
              and (role <> 'owner' or private.is_company_owner(company_id)));

create policy "company_members: admins change roles"
  on public.company_members for update to authenticated
  using (private.is_company_admin(company_id))
  with check (private.is_company_admin(company_id)
              and (role <> 'owner' or private.is_company_owner(company_id)));

create policy "company_members: admins remove or user leaves"
  on public.company_members for delete to authenticated
  using (private.is_company_admin(company_id) or user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- company_invitations
-- ---------------------------------------------------------------------
create policy "company_invitations: admins or invitee read"
  on public.company_invitations for select to authenticated
  using (private.is_company_admin(company_id)
         or lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', '')));

create policy "company_invitations: admins create"
  on public.company_invitations for insert to authenticated
  with check (private.is_company_admin(company_id) and accepted_at is null);

create policy "company_invitations: admins revoke"
  on public.company_invitations for delete to authenticated
  using (private.is_company_admin(company_id));

-- ---------------------------------------------------------------------
-- seller_verifications
-- ---------------------------------------------------------------------
create policy "seller_verifications: company admins and platform admins read"
  on public.seller_verifications for select to authenticated
  using (private.is_company_admin(company_id) or private.is_platform_admin());

create policy "seller_verifications: company admins submit"
  on public.seller_verifications for insert to authenticated
  with check (private.is_company_admin(company_id)
              and status = 'pending'
              and reviewed_by is null and reviewed_at is null and reviewer_notes is null);

create policy "seller_verifications: platform admins review"
  on public.seller_verifications for update to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());

-- ---------------------------------------------------------------------
-- pickup_locations
-- ---------------------------------------------------------------------
create policy "pickup_locations: signed-in users read"
  on public.pickup_locations for select to authenticated using (true);

create policy "pickup_locations: members insert"
  on public.pickup_locations for insert to authenticated
  with check (private.is_company_member(company_id));

create policy "pickup_locations: members update"
  on public.pickup_locations for update to authenticated
  using (private.is_company_member(company_id))
  with check (private.is_company_member(company_id));

create policy "pickup_locations: members delete"
  on public.pickup_locations for delete to authenticated
  using (private.is_company_member(company_id));

-- ---------------------------------------------------------------------
-- categories (read-only for users; admins manage)
-- ---------------------------------------------------------------------
create policy "categories: public read"
  on public.categories for select to anon, authenticated
  using (is_active or private.is_platform_admin());

create policy "categories: admins manage"
  on public.categories for all to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());

-- ---------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------
create policy "listings: public sees published, members see all of theirs"
  on public.listings for select to anon, authenticated
  using (status in ('active', 'reserved', 'sold')
         or private.is_company_member(company_id)
         or private.is_platform_admin());

create policy "listings: members create"
  on public.listings for insert to authenticated
  with check (private.is_company_member(company_id) and created_by = (select auth.uid()));

create policy "listings: members or platform admins update"
  on public.listings for update to authenticated
  using (private.is_company_member(company_id) or private.is_platform_admin())
  with check (private.is_company_member(company_id) or private.is_platform_admin());

create policy "listings: members delete"
  on public.listings for delete to authenticated
  using (private.is_company_member(company_id) or private.is_platform_admin());

-- ---------------------------------------------------------------------
-- listing_price_tiers & listing_photos (follow the parent listing)
-- ---------------------------------------------------------------------
create policy "listing_price_tiers: read if listing visible"
  on public.listing_price_tiers for select to anon, authenticated
  using (private.can_view_listing(listing_id));

create policy "listing_price_tiers: members insert"
  on public.listing_price_tiers for insert to authenticated
  with check (private.can_edit_listing(listing_id));

create policy "listing_price_tiers: members update"
  on public.listing_price_tiers for update to authenticated
  using (private.can_edit_listing(listing_id)) with check (private.can_edit_listing(listing_id));

create policy "listing_price_tiers: members delete"
  on public.listing_price_tiers for delete to authenticated
  using (private.can_edit_listing(listing_id));

create policy "listing_photos: read if listing visible"
  on public.listing_photos for select to anon, authenticated
  using (private.can_view_listing(listing_id));

create policy "listing_photos: members insert"
  on public.listing_photos for insert to authenticated
  with check (private.can_edit_listing(listing_id));

create policy "listing_photos: members update"
  on public.listing_photos for update to authenticated
  using (private.can_edit_listing(listing_id)) with check (private.can_edit_listing(listing_id));

create policy "listing_photos: members delete"
  on public.listing_photos for delete to authenticated
  using (private.can_edit_listing(listing_id));

-- ---------------------------------------------------------------------
-- favorites (private to each user)
-- ---------------------------------------------------------------------
create policy "favorites: own read"
  on public.favorites for select to authenticated
  using (user_id = (select auth.uid()));

create policy "favorites: own insert"
  on public.favorites for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "favorites: own delete"
  on public.favorites for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- wanted_requests
-- ---------------------------------------------------------------------
create policy "wanted_requests: open ones are public"
  on public.wanted_requests for select to anon, authenticated
  using (status = 'open' or private.is_company_member(company_id));

create policy "wanted_requests: members insert"
  on public.wanted_requests for insert to authenticated
  with check (private.is_company_member(company_id) and created_by = (select auth.uid()));

create policy "wanted_requests: members update"
  on public.wanted_requests for update to authenticated
  using (private.is_company_member(company_id))
  with check (private.is_company_member(company_id));

create policy "wanted_requests: members delete"
  on public.wanted_requests for delete to authenticated
  using (private.is_company_member(company_id));

-- ---------------------------------------------------------------------
-- conversations
-- Listing chat is started by the buyer; wanted-request chat by the seller.
-- ---------------------------------------------------------------------
create policy "conversations: participants read"
  on public.conversations for select to authenticated
  using (private.is_company_member(buyer_company_id) or private.is_company_member(seller_company_id));

create policy "conversations: start as buyer or responding seller"
  on public.conversations for insert to authenticated
  with check (
    started_by = (select auth.uid()) and (
      (listing_id is not null and private.is_company_member(buyer_company_id))
      or (wanted_request_id is not null and private.is_company_member(seller_company_id))
    )
  );

-- ---------------------------------------------------------------------
-- messages (no update/delete; read receipts via mark_conversation_read())
-- ---------------------------------------------------------------------
create policy "messages: participants read"
  on public.messages for select to authenticated
  using (private.is_conversation_participant(conversation_id));

create policy "messages: participants send as themselves"
  on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid())
              and read_at is null
              and private.is_conversation_participant(conversation_id));

-- ---------------------------------------------------------------------
-- purchase_requests (status transitions are validated by trigger)
-- ---------------------------------------------------------------------
create policy "purchase_requests: both sides read"
  on public.purchase_requests for select to authenticated
  using (private.is_company_member(buyer_company_id) or private.is_company_member(seller_company_id));

create policy "purchase_requests: buyers create"
  on public.purchase_requests for insert to authenticated
  with check (private.is_company_member(buyer_company_id) and requested_by = (select auth.uid()));

create policy "purchase_requests: both sides update"
  on public.purchase_requests for update to authenticated
  using (private.is_company_member(buyer_company_id) or private.is_company_member(seller_company_id))
  with check (private.is_company_member(buyer_company_id) or private.is_company_member(seller_company_id));

-- ---------------------------------------------------------------------
-- pickups
-- ---------------------------------------------------------------------
create policy "pickups: participants read"
  on public.pickups for select to authenticated
  using (private.is_request_participant(purchase_request_id));

create policy "pickups: participants propose"
  on public.pickups for insert to authenticated
  with check (private.is_request_participant(purchase_request_id));

create policy "pickups: participants update"
  on public.pickups for update to authenticated
  using (private.is_request_participant(purchase_request_id))
  with check (private.is_request_participant(purchase_request_id));

-- ---------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------
create policy "reviews: public read"
  on public.reviews for select to anon, authenticated using (true);

create policy "reviews: parties of a completed deal write"
  on public.reviews for insert to authenticated
  with check (author_id = (select auth.uid())
              and private.can_review(purchase_request_id, reviewer_company_id, reviewed_company_id));

-- ---------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------
create policy "reports: reporter or platform admin read"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or private.is_platform_admin());

create policy "reports: signed-in users file"
  on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open' and admin_notes is null);

create policy "reports: platform admins handle"
  on public.reports for update to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());

-- ---------------------------------------------------------------------
-- notifications (created by triggers only)
-- ---------------------------------------------------------------------
create policy "notifications: own read"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "notifications: own mark read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "notifications: own delete"
  on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));
