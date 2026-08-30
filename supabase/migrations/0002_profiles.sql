-- ============================================================================
-- Hommie — 0002 — universities, profiles, landlord_profiles, landlord applications
-- ============================================================================

-- ----------------------------------------------------------------------------
-- universities (reference data, publicly readable)
-- ----------------------------------------------------------------------------
create table universities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  short_name text,
  city text not null,
  campus_area text,
  website text,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table universities enable row level security;

create policy "universities are readable by everyone"
  on universities for select
  using (true);

-- ----------------------------------------------------------------------------
-- profiles — one row per auth user, created by trigger on signup
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  first_name text,
  last_name text,
  display_name text,
  avatar_url text,
  bio text,

  -- student fields
  university_id uuid references universities(id) on delete set null,
  city text,
  campus_area text,
  study_level study_level,
  student_status student_status,
  move_in_from date,
  move_in_to date,
  budget_min integer check (budget_min is null or budget_min >= 0),
  budget_max integer check (budget_max is null or budget_max >= 0),
  interests text[] not null default '{}',

  -- lifecycle
  onboarding_completed boolean not null default false,
  is_active boolean not null default true,
  is_admin boolean not null default false,
  deletion_requested_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint budget_range_valid check (
    budget_min is null or budget_max is null or budget_max >= budget_min
  ),
  constraint move_in_range_valid check (
    move_in_from is null or move_in_to is null or move_in_to >= move_in_from
  )
);

create index profiles_role_idx on profiles (role);
create index profiles_university_idx on profiles (university_id);
create index profiles_city_idx on profiles (city);

alter table profiles enable row level security;

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Role helper functions. Defined here (not 0001) because an SQL function body
-- is checked against existing objects at CREATE time and these read `profiles`.
-- SECURITY DEFINER so RLS policies on other tables can call them without
-- recursively evaluating profiles' own policies.
-- ----------------------------------------------------------------------------
create or replace function current_user_role()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function is_student()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_user_role() = 'student', false);
$$;

create or replace function is_landlord()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_user_role() = 'landlord', false);
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Everyone signed in can read basic profile rows (needed for roommate discovery,
-- message avatars, enquiry summaries). Column-level privacy is handled in the
-- app + dedicated views; sensitive fields are only shared through deliberate
-- flows. Landlords never get direct-table access to student contact details
-- beyond what a public roommate profile exposes.
create policy "authenticated users can read active profiles"
  on profiles for select
  to authenticated
  using (is_active = true);

create policy "users can insert their own profile"
  on profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "users can update their own profile"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_user_role());

-- No delete policy: account deletion is a request flow (deletion_requested_at)
-- handled by an admin / edge function using the service role.

-- ----------------------------------------------------------------------------
-- landlord_profiles — extra fields for landlord accounts
-- ----------------------------------------------------------------------------
create table landlord_profiles (
  id uuid primary key references profiles(id) on delete cascade,
  business_name text,
  contact_name text not null,
  phone text,
  preferred_contact text not null default 'in_app' check (preferred_contact in ('in_app', 'phone', 'email')),
  operating_areas text[] not null default '{}',
  description text,
  logo_url text,
  verification verification_status not null default 'unverified',
  verification_submitted_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table landlord_profiles enable row level security;

create trigger landlord_profiles_set_updated_at
  before update on landlord_profiles
  for each row execute function set_updated_at();

create policy "landlord profiles are readable by authenticated users"
  on landlord_profiles for select
  to authenticated
  using (true);

create policy "landlord can insert own landlord profile"
  on landlord_profiles for insert
  to authenticated
  with check (id = auth.uid() and public.is_landlord());

create policy "landlord can update own landlord profile"
  on landlord_profiles for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- verification fields cannot be self-promoted to 'verified'; enforced by trigger
  );

-- Prevent self-verification: a landlord may move unverified -> submitted only.
create or replace function guard_landlord_verification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() = new.id then
    if new.verification = 'verified' and old.verification <> 'verified' then
      raise exception 'Verification can only be granted by Hommie staff';
    end if;
    if new.verification = 'submitted' and old.verification = 'unverified' then
      new.verification_submitted_at = now();
    end if;
    -- keep staff-only columns unchanged on self-update
    new.verified_at = old.verified_at;
    new.verified_by = old.verified_by;
  end if;
  return new;
end;
$$;

create trigger landlord_profiles_guard_verification
  before update on landlord_profiles
  for each row execute function guard_landlord_verification();

-- ----------------------------------------------------------------------------
-- landlord_applications — "Apply to become a landlord" flow for students
-- ----------------------------------------------------------------------------
create table landlord_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  status landlord_application_status not null default 'pending',
  business_name text,
  phone text not null,
  operating_areas text[] not null default '{}',
  message text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index landlord_applications_one_pending_per_user
  on landlord_applications (user_id)
  where status = 'pending';

alter table landlord_applications enable row level security;

create trigger landlord_applications_set_updated_at
  before update on landlord_applications
  for each row execute function set_updated_at();

create policy "users manage their own landlord applications"
  on landlord_applications for select
  to authenticated
  using (user_id = auth.uid());

create policy "students can create a landlord application"
  on landlord_applications for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_student());
