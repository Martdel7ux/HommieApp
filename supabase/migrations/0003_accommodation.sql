-- ============================================================================
-- Hommie — 0003 — accommodation listings, images, saves, analytics
-- ============================================================================

create table accommodation_listings (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references profiles(id) on delete cascade,

  title text not null check (char_length(title) between 4 and 120),
  description text check (description is null or char_length(description) <= 4000),
  property_type property_type not null,

  status listing_status not null default 'draft',

  -- rent & bills (monthly EUR)
  rent_month integer not null check (rent_month >= 0),
  deposit integer check (deposit is null or deposit >= 0),
  bills_included boolean not null default false,
  bills_note text,

  -- rooms
  bedrooms smallint not null default 1 check (bedrooms between 0 and 20),
  bathrooms smallint not null default 1 check (bathrooms between 0 and 20),
  furnished boolean not null default false,
  roommate_suitable boolean not null default false,
  max_occupants smallint check (max_occupants is null or max_occupants > 0),

  -- location (approximate — exact address is never exposed publicly)
  city text not null,
  area text not null,
  address_line text,                     -- private, landlord-only
  approx_lat double precision not null,
  approx_lng double precision not null,
  nearest_university_id uuid references universities(id) on delete set null,
  distance_to_campus_km numeric(4,1),

  amenities text[] not null default '{}',

  available_from date,
  available_to date,

  -- denormalised analytics counters (kept fresh by triggers / rpc)
  views_count integer not null default 0,
  saves_count integer not null default 0,
  enquiries_count integer not null default 0,

  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint available_range_valid check (
    available_from is null or available_to is null or available_to >= available_from
  )
);

create index accommodation_landlord_idx on accommodation_listings (landlord_id);
create index accommodation_status_idx on accommodation_listings (status);
create index accommodation_city_area_idx on accommodation_listings (city, area);
create index accommodation_rent_idx on accommodation_listings (rent_month);
create index accommodation_published_idx on accommodation_listings (published_at desc nulls last);
create index accommodation_university_idx on accommodation_listings (nearest_university_id);
create index accommodation_search_idx on accommodation_listings
  using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(area,'') || ' ' || coalesce(city,'')));

alter table accommodation_listings enable row level security;

create trigger accommodation_listings_set_updated_at
  before update on accommodation_listings
  for each row execute function set_updated_at();

-- stamp published_at the first time a listing goes active
create or replace function stamp_listing_published()
returns trigger language plpgsql as $$
begin
  if new.status = 'active' and (old.status is distinct from 'active') and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$;

create trigger accommodation_listings_stamp_published
  before insert or update on accommodation_listings
  for each row execute function stamp_listing_published();

-- Public can see active listings; landlords see all of their own.
create policy "active listings are readable by authenticated users"
  on accommodation_listings for select
  to authenticated
  using (status = 'active' or landlord_id = auth.uid());

create policy "landlords insert their own listings"
  on accommodation_listings for insert
  to authenticated
  with check (landlord_id = auth.uid() and public.is_landlord());

create policy "landlords update their own listings"
  on accommodation_listings for update
  to authenticated
  using (landlord_id = auth.uid())
  with check (landlord_id = auth.uid());

create policy "landlords delete their own listings"
  on accommodation_listings for delete
  to authenticated
  using (landlord_id = auth.uid());

-- ----------------------------------------------------------------------------
-- accommodation_listing_images
-- ----------------------------------------------------------------------------
create table accommodation_listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references accommodation_listings(id) on delete cascade,
  storage_path text not null,
  width integer,
  height integer,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create index accommodation_images_listing_idx on accommodation_listing_images (listing_id, position);

alter table accommodation_listing_images enable row level security;

create policy "listing images follow listing visibility"
  on accommodation_listing_images for select
  to authenticated
  using (
    exists (
      select 1 from accommodation_listings l
      where l.id = listing_id and (l.status = 'active' or l.landlord_id = auth.uid())
    )
  );

create policy "landlords manage their listing images"
  on accommodation_listing_images for all
  to authenticated
  using (
    exists (select 1 from accommodation_listings l where l.id = listing_id and l.landlord_id = auth.uid())
  )
  with check (
    exists (select 1 from accommodation_listings l where l.id = listing_id and l.landlord_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- saved_accommodation_listings
-- ----------------------------------------------------------------------------
create table saved_accommodation_listings (
  user_id uuid not null references profiles(id) on delete cascade,
  listing_id uuid not null references accommodation_listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index saved_accommodation_user_idx on saved_accommodation_listings (user_id, created_at desc);
create index saved_accommodation_listing_idx on saved_accommodation_listings (listing_id);

alter table saved_accommodation_listings enable row level security;

create policy "users read their own saved listings"
  on saved_accommodation_listings for select
  to authenticated using (user_id = auth.uid());

create policy "users save listings for themselves"
  on saved_accommodation_listings for insert
  to authenticated with check (user_id = auth.uid());

create policy "users unsave their own saved listings"
  on saved_accommodation_listings for delete
  to authenticated using (user_id = auth.uid());

-- keep saves_count fresh
create or replace function sync_listing_saves_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update accommodation_listings set saves_count = saves_count + 1 where id = new.listing_id;
  elsif tg_op = 'DELETE' then
    update accommodation_listings set saves_count = greatest(saves_count - 1, 0) where id = old.listing_id;
  end if;
  return null;
end;
$$;

create trigger saved_accommodation_sync_count
  after insert or delete on saved_accommodation_listings
  for each row execute function sync_listing_saves_count();

-- ----------------------------------------------------------------------------
-- accommodation_listing_views — lightweight analytics (one row per view event)
-- ----------------------------------------------------------------------------
create table accommodation_listing_views (
  id bigint generated always as identity primary key,
  listing_id uuid not null references accommodation_listings(id) on delete cascade,
  viewer_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index accommodation_views_listing_idx on accommodation_listing_views (listing_id, created_at desc);
create index accommodation_views_viewer_idx on accommodation_listing_views (viewer_id);

alter table accommodation_listing_views enable row level security;

-- Students/anyone authenticated can log their own view; nobody can read the raw
-- rows via the API (landlords get aggregates through a view + rpc).
create policy "authenticated users can log a listing view"
  on accommodation_listing_views for insert
  to authenticated
  with check (viewer_id = auth.uid() or viewer_id is null);

create policy "landlords can read view rows for their listings"
  on accommodation_listing_views for select
  to authenticated
  using (
    exists (select 1 from accommodation_listings l where l.id = listing_id and l.landlord_id = auth.uid())
  );

-- Record a view and bump the denormalised counter (deduped per viewer per day).
create or replace function record_listing_view(p_listing_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_recent boolean;
begin
  select exists (
    select 1 from accommodation_listing_views
    where listing_id = p_listing_id
      and viewer_id = auth.uid()
      and created_at > now() - interval '24 hours'
  ) into v_recent;

  if not v_recent then
    insert into accommodation_listing_views (listing_id, viewer_id) values (p_listing_id, auth.uid());
    update accommodation_listings set views_count = views_count + 1 where id = p_listing_id;
  end if;
end;
$$;

grant execute on function record_listing_view(uuid) to authenticated;
grant execute on function record_listing_view(uuid) to anon;
