-- =====================================================================
-- SecondShift · 0003 · Storage buckets + policies
--
-- Path conventions (first folder decides who may write):
--   listing-photos       {company_id}/{listing_id}/{file}     public
--   company-logos        {company_id}/{file}                  public
--   avatars              {user_id}/{file}                     public
--   verification-docs    {company_id}/{file}                  private (company admins + platform admins)
--   wipe-certificates    {company_id}/{listing_id}/{file}     private (company members + platform admins)
--   message-attachments  {conversation_id}/{file}             private (conversation participants)
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('listing-photos',      'listing-photos',      true,  10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('company-logos',       'company-logos',       true,  2097152,  array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars',             'avatars',             true,  2097152,  array['image/jpeg', 'image/png', 'image/webp']),
  ('verification-docs',   'verification-docs',   false, 10485760, array['application/pdf', 'image/jpeg', 'image/png']),
  ('wipe-certificates',   'wipe-certificates',   false, 10485760, array['application/pdf', 'image/jpeg', 'image/png']),
  ('message-attachments', 'message-attachments', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ---------- listing-photos ----------
create policy "listing-photos: members read"
  on storage.objects for select to authenticated
  using (bucket_id = 'listing-photos' and private.is_company_member_path((storage.foldername(name))[1]));
create policy "listing-photos: members upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos' and private.is_company_member_path((storage.foldername(name))[1]));
create policy "listing-photos: members update"
  on storage.objects for update to authenticated
  using (bucket_id = 'listing-photos' and private.is_company_member_path((storage.foldername(name))[1]));
create policy "listing-photos: members delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and private.is_company_member_path((storage.foldername(name))[1]));

-- ---------- company-logos ----------
create policy "company-logos: admins read"
  on storage.objects for select to authenticated
  using (bucket_id = 'company-logos' and private.is_company_admin_path((storage.foldername(name))[1]));
create policy "company-logos: admins upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'company-logos' and private.is_company_admin_path((storage.foldername(name))[1]));
create policy "company-logos: admins update"
  on storage.objects for update to authenticated
  using (bucket_id = 'company-logos' and private.is_company_admin_path((storage.foldername(name))[1]));
create policy "company-logos: admins delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'company-logos' and private.is_company_admin_path((storage.foldername(name))[1]));

-- ---------- avatars ----------
create policy "avatars: own read"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: own upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: own update"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: own delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------- verification-docs ----------
create policy "verification-docs: company admins and platform admins read"
  on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs'
         and (private.is_company_admin_path((storage.foldername(name))[1]) or private.is_platform_admin()));
create policy "verification-docs: company admins upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-docs' and private.is_company_admin_path((storage.foldername(name))[1]));
create policy "verification-docs: company admins delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'verification-docs' and private.is_company_admin_path((storage.foldername(name))[1]));

-- ---------- wipe-certificates ----------
create policy "wipe-certificates: members and platform admins read"
  on storage.objects for select to authenticated
  using (bucket_id = 'wipe-certificates'
         and (private.is_company_member_path((storage.foldername(name))[1]) or private.is_platform_admin()));
create policy "wipe-certificates: members upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'wipe-certificates' and private.is_company_member_path((storage.foldername(name))[1]));
create policy "wipe-certificates: members delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'wipe-certificates' and private.is_company_member_path((storage.foldername(name))[1]));

-- ---------- message-attachments ----------
create policy "message-attachments: participants read"
  on storage.objects for select to authenticated
  using (bucket_id = 'message-attachments'
         and private.is_conversation_participant_path((storage.foldername(name))[1]));
create policy "message-attachments: participants upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'message-attachments'
              and private.is_conversation_participant_path((storage.foldername(name))[1]));
