-- ============================================================================
-- Hommie — 0016 — jobs board (student opportunities)
-- ============================================================================
-- The student "Explore" tab becomes a jobs board. Jobs are curated content:
-- publicly readable when active, writable only by admins (no employer accounts
-- yet). Students can save jobs and "Apply" opens an external URL or email.
-- ----------------------------------------------------------------------------

create type job_type as enum ('part_time', 'internship', 'full_time', 'contract', 'seasonal');
create type job_work_mode as enum ('on_site', 'remote', 'hybrid', 'on_campus');
create type job_pay_period as enum ('hour', 'day', 'week', 'month', 'year', 'fixed');
create type job_status as enum ('draft', 'active', 'filled', 'expired');

create table jobs (
  id uuid primary key default gen_random_uuid(),

  title text not null check (char_length(title) between 2 and 140),
  company text not null check (char_length(company) between 1 and 140),
  company_logo_url text,

  location text not null,                         -- "Nicosia", "Limassol", "Anywhere"
  work_mode job_work_mode not null default 'on_site',
  job_type job_type not null,

  pay_min integer check (pay_min is null or pay_min >= 0),
  pay_max integer check (pay_max is null or pay_max >= 0),
  pay_period job_pay_period,
  pay_note text,                                  -- e.g. "plus commission", "DOE"

  student_friendly boolean not null default false,
  verified boolean not null default false,

  summary text check (summary is null or char_length(summary) <= 400),
  description text check (description is null or char_length(description) <= 6000),
  responsibilities text[] not null default '{}',
  requirements text[] not null default '{}',

  apply_url text,
  apply_email text,

  status job_status not null default 'active',
  posted_by uuid references profiles(id) on delete set null,
  expires_on date,
  published_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pay_range_valid check (pay_min is null or pay_max is null or pay_max >= pay_min),
  constraint has_apply_route check (apply_url is not null or apply_email is not null)
);

create index jobs_status_idx on jobs (status);
create index jobs_type_idx on jobs (job_type);
create index jobs_work_mode_idx on jobs (work_mode);
create index jobs_published_idx on jobs (published_at desc nulls last);
create index jobs_search_idx on jobs
  using gin (to_tsvector('simple',
    coalesce(title,'') || ' ' || coalesce(company,'') || ' ' ||
    coalesce(summary,'') || ' ' || coalesce(location,'')));

alter table jobs enable row level security;

create trigger jobs_set_updated_at
  before update on jobs
  for each row execute function set_updated_at();

create policy "active jobs are readable by authenticated users"
  on jobs for select
  to authenticated
  using (status = 'active' or posted_by = auth.uid() or public.is_admin());

create policy "admins manage jobs"
  on jobs for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- saved_jobs
-- ----------------------------------------------------------------------------
create table saved_jobs (
  user_id uuid not null references profiles(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

create index saved_jobs_user_idx on saved_jobs (user_id);

alter table saved_jobs enable row level security;

create policy "users read their own saved jobs"
  on saved_jobs for select
  to authenticated
  using (user_id = auth.uid());

create policy "users save jobs for themselves"
  on saved_jobs for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users unsave their own jobs"
  on saved_jobs for delete
  to authenticated
  using (user_id = auth.uid());
