-- =====================================================================
-- SecondShift: Sri Lanka launch + new sign-up flow
--  * LKR currency and Sri Lanka (LK) as default country, district field
--  * account_type (seller | buyer) stored in public.profiles
--  * sign-up creates the profile and, when a company name is given, the company
--  * company contact person + position (asked during verification)
--  * TIN on verification requests, Sri Lankan document types
-- =====================================================================

-- ---------- Sri Lanka defaults ----------
alter table public.companies        alter column country_code set default 'LK';
alter table public.pickup_locations alter column country_code set default 'LK';
alter table public.listings         alter column currency     set default 'LKR';

update public.companies        set country_code = 'LK' where country_code = 'DE';
update public.pickup_locations set country_code = 'LK' where country_code = 'DE';
update public.listings         set currency     = 'LKR' where currency = 'EUR';

-- District (Colombo, Gampaha, Kandy …). companies.region is used for the company's district.
alter table public.pickup_locations
  add column if not exists district text check (char_length(district) <= 40);
-- Postal codes are optional in Sri Lanka
alter table public.pickup_locations alter column postal_code drop not null;

-- ---------- Company contact person ----------
alter table public.companies
  add column if not exists contact_person   text check (char_length(contact_person) <= 120),
  add column if not exists contact_position text check (char_length(contact_position) <= 120);

-- ---------- Verification: TIN + Sri Lankan documents ----------
alter table public.seller_verifications
  add column if not exists tax_id text check (char_length(tax_id) <= 30);

alter table public.seller_verifications drop constraint if exists seller_verifications_document_type_check;
alter table public.seller_verifications add constraint seller_verifications_document_type_check
  check (document_type in (
    'br_certificate',          -- Business Registration certificate (Divisional Secretariat / Provincial Council)
    'incorporation_certificate', -- Certificate of Incorporation (Registrar of Companies, Form 1)
    'tin_certificate',         -- TIN certificate (Inland Revenue Department)
    'vat_certificate',         -- VAT registration certificate (IRD)
    'trade_register_extract', 'business_registration', -- legacy values
    'other'
  ));

-- ---------- Account type on the profile ----------
alter table public.profiles
  add column if not exists account_type text not null default 'buyer'
  check (account_type in ('seller', 'buyer'));

-- Backfill from the auth metadata used before this migration
update public.profiles p
   set account_type = 'seller'
  from auth.users u
 where u.id = p.id and u.raw_user_meta_data ->> 'account_type' = 'seller';

-- Users can't change their own account type (a buyer can't turn into a seller from the app)
create or replace function private.guard_profile_account_type()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    new.account_type := old.account_type;
  end if;
  return new;
end $$;

drop trigger if exists guard_profile_account_type on public.profiles;
create trigger guard_profile_account_type
  before update on public.profiles
  for each row execute function private.guard_profile_account_type();

-- ---------- Sign-up: profile + company from the registration form ----------
-- raw_user_meta_data: { full_name, account_type: 'seller'|'buyer', company_name? }
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_type    text := case when new.raw_user_meta_data ->> 'account_type' = 'seller' then 'seller' else 'buyer' end;
  v_company text := nullif(btrim(new.raw_user_meta_data ->> 'company_name'), '');
begin
  insert into public.profiles (id, full_name, account_type)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)), v_type)
  on conflict (id) do nothing;

  if v_company is not null and char_length(v_company) between 2 and 120 then
    -- add_company_owner trigger makes the new user the owner
    insert into public.companies (name, contact_email, is_seller, is_buyer, country_code, created_by)
    values (v_company, new.email, v_type = 'seller', true, 'LK', new.id);
  end if;

  return new;
end $$;
