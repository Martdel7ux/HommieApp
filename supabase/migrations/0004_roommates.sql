-- ============================================================================
-- Hommie — 0004 — roommate preferences / profiles + saves
-- ============================================================================

create table roommate_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,

  is_published boolean not null default false,
  headline text check (headline is null or char_length(headline) <= 120),
  about text check (about is null or char_length(about) <= 2000),

  -- discovery filters
  preferred_city text,
  preferred_areas text[] not null default '{}',
  university_id uuid references universities(id) on delete set null,
  budget_min integer check (budget_min is null or budget_min >= 0),
  budget_max integer check (budget_max is null or budget_max >= 0),
  move_in_from date,
  move_in_to date,

  -- lifestyle
  smoking text not null default 'no_preference' check (smoking in ('yes', 'no', 'outside_only', 'no_preference')),
  pets text not null default 'no_preference' check (pets in ('yes', 'no', 'no_preference')),
  cleanliness smallint check (cleanliness between 1 and 5),
  sleep_schedule text check (sleep_schedule in ('early_bird', 'night_owl', 'flexible')),
  social_level text check (social_level in ('homebody', 'balanced', 'very_social')),
  guests_frequency text check (guests_frequency in ('rarely', 'sometimes', 'often')),
  gender_preference text not null default 'no_preference' check (gender_preference in ('same', 'any', 'no_preference')),
  lifestyle_tags text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint rp_budget_valid check (budget_min is null or budget_max is null or budget_max >= budget_min)
);

create index roommate_prefs_published_idx on roommate_preferences (is_published);
create index roommate_prefs_city_idx on roommate_preferences (preferred_city);
create index roommate_prefs_university_idx on roommate_preferences (university_id);

alter table roommate_preferences enable row level security;

create trigger roommate_preferences_set_updated_at
  before update on roommate_preferences
  for each row execute function set_updated_at();

create policy "published roommate profiles readable by students"
  on roommate_preferences for select
  to authenticated
  using (
    (is_published = true and public.is_student())
    or user_id = auth.uid()
  );

create policy "students manage their own roommate profile"
  on roommate_preferences for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_student());

create policy "students update their own roommate profile"
  on roommate_preferences for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "students delete their own roommate profile"
  on roommate_preferences for delete
  to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- saved_roommate_profiles
-- ----------------------------------------------------------------------------
create table saved_roommate_profiles (
  user_id uuid not null references profiles(id) on delete cascade,
  saved_profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, saved_profile_id),
  constraint no_self_save check (user_id <> saved_profile_id)
);

create index saved_roommate_user_idx on saved_roommate_profiles (user_id, created_at desc);

alter table saved_roommate_profiles enable row level security;

create policy "users read their saved roommate profiles"
  on saved_roommate_profiles for select
  to authenticated using (user_id = auth.uid());

create policy "users save roommate profiles for themselves"
  on saved_roommate_profiles for insert
  to authenticated with check (user_id = auth.uid() and public.is_student());

create policy "users remove their saved roommate profiles"
  on saved_roommate_profiles for delete
  to authenticated using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Explainable compatibility score (0-100) — heuristic, not "scientific".
-- Compares budget overlap, location, move-in timing and lifestyle.
-- ----------------------------------------------------------------------------
create or replace function roommate_compatibility(a uuid, b uuid)
returns table (score integer, reasons text[])
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  ra roommate_preferences;
  rb roommate_preferences;
  s integer := 0;
  r text[] := '{}';
begin
  select * into ra from roommate_preferences where user_id = a;
  select * into rb from roommate_preferences where user_id = b;
  if ra is null or rb is null then
    return query select 0, array['Not enough information yet']::text[];
    return;
  end if;

  -- Budget overlap (30)
  if ra.budget_min is not null and ra.budget_max is not null
     and rb.budget_min is not null and rb.budget_max is not null then
    if least(ra.budget_max, rb.budget_max) >= greatest(ra.budget_min, rb.budget_min) then
      s := s + 30; r := r || 'Similar budget';
    else
      s := s + 8;
    end if;
  else
    s := s + 12;
  end if;

  -- Location (25)
  if ra.preferred_city is not null and ra.preferred_city = rb.preferred_city then
    s := s + 15; r := r || 'Same city';
    if ra.preferred_areas && rb.preferred_areas then
      s := s + 10; r := r || 'Overlapping preferred areas';
    end if;
  end if;

  -- Move-in timing (20)
  if ra.move_in_from is not null and rb.move_in_from is not null
     and abs(ra.move_in_from - rb.move_in_from) <= 31 then
    s := s + 20; r := r || 'Similar move-in period';
  elsif ra.move_in_from is not null and rb.move_in_from is not null
     and abs(ra.move_in_from - rb.move_in_from) <= 62 then
    s := s + 10;
  end if;

  -- Lifestyle (25)
  if ra.smoking = rb.smoking and ra.smoking <> 'no_preference' then s := s + 6; r := r || 'Matching smoking preference'; end if;
  if ra.sleep_schedule is not null and ra.sleep_schedule = rb.sleep_schedule then s := s + 6; r := r || 'Similar sleep schedule'; end if;
  if ra.cleanliness is not null and rb.cleanliness is not null and abs(ra.cleanliness - rb.cleanliness) <= 1 then s := s + 7; r := r || 'Similar cleanliness'; end if;
  if ra.social_level is not null and ra.social_level = rb.social_level then s := s + 6; r := r || 'Similar social style'; end if;

  if array_length(r, 1) is null then r := array['Some things in common']; end if;
  return query select least(s, 100), r;
end;
$$;

grant execute on function roommate_compatibility(uuid, uuid) to authenticated;
