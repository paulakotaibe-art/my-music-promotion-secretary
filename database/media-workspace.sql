-- Promotional assets are deliberately public by link; account-owned writes only.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('promotion-media','promotion-media',true,52428800,array['video/mp4','video/quicktime','video/webm','audio/mpeg','audio/mp4','audio/wav','image/jpeg','image/png','image/webp']);
create policy promotion_upload on storage.objects for insert to authenticated with check (
 bucket_id='promotion-media' and (storage.foldername(name))[1]=(select auth.uid())::text
 and name ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(mp4|mov|webm|mp3|m4a|wav|jpg|jpeg|png|webp)$'
);
create policy promotion_owner_read on storage.objects for select to authenticated using (bucket_id='promotion-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- No overwrite policy: every upload gets a new immutable object name.
alter table public.campaign_drafts
 add column artist text not null default '' check(length(artist)<=120),
 add column cover_url text not null default '' check(cover_url='' or cover_url ~ '^https://'),
 add column media_kind text not null default 'video' check(media_kind in ('video','audio')),
 add column is_public boolean not null default false;
grant select(id,title,artist,caption,cover_url,media_url,media_kind,is_public) on public.campaign_drafts to anon;
create policy public_album_pages on public.campaign_drafts for select to anon using (is_public=true);
