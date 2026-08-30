-- ============================================================================
-- Hommie — 0005 — community posts/comments/likes, events/rsvps, marketplace
-- ============================================================================

-- ----------------------------------------------------------------------------
-- community_posts
-- ----------------------------------------------------------------------------
create table community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  category community_category not null default 'general',
  body text not null check (char_length(body) between 1 and 4000),
  image_paths text[] not null default '{}',
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index community_posts_category_idx on community_posts (category, created_at desc);
create index community_posts_author_idx on community_posts (author_id);
create index community_posts_created_idx on community_posts (created_at desc);

alter table community_posts enable row level security;

create trigger community_posts_set_updated_at
  before update on community_posts for each row execute function set_updated_at();

create policy "community posts readable by students"
  on community_posts for select to authenticated
  using ((is_hidden = false and public.is_student()) or author_id = auth.uid());

create policy "students create their own posts"
  on community_posts for insert to authenticated
  with check (author_id = auth.uid() and public.is_student());

create policy "authors update their own posts"
  on community_posts for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy "authors delete their own posts"
  on community_posts for delete to authenticated
  using (author_id = auth.uid());

-- ----------------------------------------------------------------------------
-- community_comments
-- ----------------------------------------------------------------------------
create table community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references community_posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index community_comments_post_idx on community_comments (post_id, created_at);

alter table community_comments enable row level security;

create policy "comments readable by students"
  on community_comments for select to authenticated
  using ((is_hidden = false and public.is_student()) or author_id = auth.uid());

create policy "students create their own comments"
  on community_comments for insert to authenticated
  with check (author_id = auth.uid() and public.is_student());

create policy "authors delete their own comments"
  on community_comments for delete to authenticated
  using (author_id = auth.uid());

-- ----------------------------------------------------------------------------
-- community_post_likes
-- ----------------------------------------------------------------------------
create table community_post_likes (
  post_id uuid not null references community_posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table community_post_likes enable row level security;

create policy "likes readable by students"
  on community_post_likes for select to authenticated using (public.is_student());

create policy "students like as themselves"
  on community_post_likes for insert to authenticated
  with check (user_id = auth.uid() and public.is_student());

create policy "students remove their own like"
  on community_post_likes for delete to authenticated using (user_id = auth.uid());

-- counters
create or replace function sync_community_counts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'community_post_likes' then
    if tg_op = 'INSERT' then
      update community_posts set likes_count = likes_count + 1 where id = new.post_id;
    elsif tg_op = 'DELETE' then
      update community_posts set likes_count = greatest(likes_count - 1, 0) where id = old.post_id;
    end if;
  elsif tg_table_name = 'community_comments' then
    if tg_op = 'INSERT' then
      update community_posts set comments_count = comments_count + 1 where id = new.post_id;
    elsif tg_op = 'DELETE' then
      update community_posts set comments_count = greatest(comments_count - 1, 0) where id = old.post_id;
    end if;
  end if;
  return null;
end;
$$;

create trigger community_likes_count after insert or delete on community_post_likes
  for each row execute function sync_community_counts();
create trigger community_comments_count after insert or delete on community_comments
  for each row execute function sync_community_counts();

-- ----------------------------------------------------------------------------
-- events (creation restricted to approved/admin accounts via is_admin flag)
-- ----------------------------------------------------------------------------
create table events (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 140),
  description text check (description is null or char_length(description) <= 4000),
  host_name text not null,
  cover_image_path text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location_name text not null,
  city text not null,
  area text,
  approx_lat double precision,
  approx_lng double precision,
  external_url text,
  rsvp_count integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_time_valid check (ends_at is null or ends_at >= starts_at)
);

create index events_starts_idx on events (starts_at);
create index events_city_idx on events (city, starts_at);

alter table events enable row level security;

create trigger events_set_updated_at before update on events
  for each row execute function set_updated_at();

create policy "published events readable by authenticated users"
  on events for select to authenticated
  using (is_published = true or created_by = auth.uid());

-- Only accounts flagged is_admin (see 0007) may create events in V1.
create policy "admins create events"
  on events for insert to authenticated
  with check (created_by = auth.uid() and public.is_admin());

create policy "event creators update their events"
  on events for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy "event creators delete their events"
  on events for delete to authenticated using (created_by = auth.uid());

-- ----------------------------------------------------------------------------
-- event_rsvps
-- ----------------------------------------------------------------------------
create table event_rsvps (
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  state text not null default 'going' check (state in ('going', 'interested')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index event_rsvps_user_idx on event_rsvps (user_id);

alter table event_rsvps enable row level security;

create policy "rsvps readable by authenticated users"
  on event_rsvps for select to authenticated using (true);

create policy "users rsvp as themselves"
  on event_rsvps for insert to authenticated with check (user_id = auth.uid());

create policy "users update their own rsvp"
  on event_rsvps for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "users remove their own rsvp"
  on event_rsvps for delete to authenticated using (user_id = auth.uid());

create or replace function sync_event_rsvp_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update events set rsvp_count = rsvp_count + 1 where id = new.event_id;
  elsif tg_op = 'DELETE' then
    update events set rsvp_count = greatest(rsvp_count - 1, 0) where id = old.event_id;
  end if;
  return null;
end;
$$;

create trigger event_rsvps_count after insert or delete on event_rsvps
  for each row execute function sync_event_rsvp_count();

-- ----------------------------------------------------------------------------
-- marketplace_listings + images + saves
-- ----------------------------------------------------------------------------
create table marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  description text check (description is null or char_length(description) <= 3000),
  category marketplace_category not null,
  condition marketplace_condition not null,
  price integer not null check (price >= 0),
  is_free boolean not null default false,
  city text not null,
  area text,
  status text not null default 'active' check (status in ('active', 'reserved', 'sold', 'archived')),
  saves_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index marketplace_category_idx on marketplace_listings (category, created_at desc);
create index marketplace_seller_idx on marketplace_listings (seller_id);
create index marketplace_status_idx on marketplace_listings (status);
create index marketplace_price_idx on marketplace_listings (price);

alter table marketplace_listings enable row level security;

create trigger marketplace_listings_set_updated_at before update on marketplace_listings
  for each row execute function set_updated_at();

create policy "active marketplace listings readable by students"
  on marketplace_listings for select to authenticated
  using ((status <> 'archived' and public.is_student()) or seller_id = auth.uid());

create policy "students create their own marketplace listings"
  on marketplace_listings for insert to authenticated
  with check (seller_id = auth.uid() and public.is_student());

create policy "sellers update their own marketplace listings"
  on marketplace_listings for update to authenticated
  using (seller_id = auth.uid()) with check (seller_id = auth.uid());

create policy "sellers delete their own marketplace listings"
  on marketplace_listings for delete to authenticated using (seller_id = auth.uid());

create table marketplace_listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references marketplace_listings(id) on delete cascade,
  storage_path text not null,
  position smallint not null default 0,
  created_at timestamptz not null default now()
);

create index marketplace_images_listing_idx on marketplace_listing_images (listing_id, position);

alter table marketplace_listing_images enable row level security;

create policy "marketplace images follow listing visibility"
  on marketplace_listing_images for select to authenticated
  using (exists (
    select 1 from marketplace_listings m
    where m.id = listing_id and ((m.status <> 'archived' and public.is_student()) or m.seller_id = auth.uid())
  ));

create policy "sellers manage their marketplace images"
  on marketplace_listing_images for all to authenticated
  using (exists (select 1 from marketplace_listings m where m.id = listing_id and m.seller_id = auth.uid()))
  with check (exists (select 1 from marketplace_listings m where m.id = listing_id and m.seller_id = auth.uid()));

create table saved_marketplace_listings (
  user_id uuid not null references profiles(id) on delete cascade,
  listing_id uuid not null references marketplace_listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index saved_marketplace_user_idx on saved_marketplace_listings (user_id, created_at desc);

alter table saved_marketplace_listings enable row level security;

create policy "users read their saved marketplace items"
  on saved_marketplace_listings for select to authenticated using (user_id = auth.uid());

create policy "users save marketplace items for themselves"
  on saved_marketplace_listings for insert to authenticated with check (user_id = auth.uid());

create policy "users unsave their marketplace items"
  on saved_marketplace_listings for delete to authenticated using (user_id = auth.uid());

create or replace function sync_marketplace_saves_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update marketplace_listings set saves_count = saves_count + 1 where id = new.listing_id;
  elsif tg_op = 'DELETE' then
    update marketplace_listings set saves_count = greatest(saves_count - 1, 0) where id = old.listing_id;
  end if;
  return null;
end;
$$;

create trigger saved_marketplace_sync_count after insert or delete on saved_marketplace_listings
  for each row execute function sync_marketplace_saves_count();
