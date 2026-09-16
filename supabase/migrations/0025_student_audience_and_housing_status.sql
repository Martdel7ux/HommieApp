-- ============================================================================
-- Hommie — 0025 — student audience + roommate housing status
-- ============================================================================

-- Shared enum, mirrors verification_status's pattern of reuse across tables.
create type student_audience as enum ('erasmus', 'full_time', 'both');

-- Accommodation: landlord-set, default 'both' so pre-migration listings stay
-- visible under either audience filter.
alter table accommodation_listings
  add column student_audience student_audience not null default 'both';

-- Roommates: student-set, same shared type + default.
alter table roommate_preferences
  add column student_audience student_audience not null default 'both';

-- Roommates only: optional housing status (no neutral default — null means
-- "not specified" and is included regardless of which filter is applied,
-- until a specific filter is actively chosen).
alter table roommate_preferences
  add column housing_status text
    check (housing_status is null or housing_status in ('has_flat', 'needs_flat'));

-- Actual rent of the student's existing flat (distinct from budget_min/max,
-- which is their own search budget for a place to join).
alter table roommate_preferences
  add column flat_rent_month integer check (flat_rent_month is null or flat_rent_month >= 0);

-- ----------------------------------------------------------------------------
-- roommate_flat_photos — mirrors accommodation_listing_images exactly
-- ----------------------------------------------------------------------------
create table roommate_flat_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  storage_path text not null,
  width integer,
  height integer,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create index roommate_flat_photos_user_idx on roommate_flat_photos (user_id, position);

alter table roommate_flat_photos enable row level security;

-- Mirrors roommate_preferences' own select policy (0004_roommates.sql).
create policy "flat photos follow profile visibility"
  on roommate_flat_photos for select
  to authenticated
  using (
    exists (
      select 1 from roommate_preferences rp
      where rp.user_id = roommate_flat_photos.user_id
        and ((rp.is_published = true and public.is_student()) or rp.user_id = auth.uid())
    )
  );

create policy "students manage their own flat photos"
  on roommate_flat_photos for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- storage bucket — roommate-flat-images (mirrors 0009_storage.sql's shape)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('roommate-flat-images', 'roommate-flat-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "roommate-flat-images read"
  on storage.objects for select
  using (bucket_id = 'roommate-flat-images');

create policy "roommate-flat-images owner insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'roommate-flat-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "roommate-flat-images owner update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'roommate-flat-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "roommate-flat-images owner delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'roommate-flat-images' and (storage.foldername(name))[1] = auth.uid()::text);
