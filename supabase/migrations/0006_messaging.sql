-- ============================================================================
-- Hommie — 0006 — conversations, participants, messages, enquiries
-- ============================================================================

create table conversations (
  id uuid primary key default gen_random_uuid(),
  context conversation_context not null default 'general',
  -- optional context anchors
  accommodation_listing_id uuid references accommodation_listings(id) on delete set null,
  marketplace_listing_id uuid references marketplace_listings(id) on delete set null,
  roommate_profile_id uuid references profiles(id) on delete set null,
  created_by uuid not null references profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  created_at timestamptz not null default now()
);

create index conversations_last_message_idx on conversations (last_message_at desc);

alter table conversations enable row level security;

create table conversation_participants (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  archived boolean not null default false,
  muted boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index conversation_participants_user_idx on conversation_participants (user_id);

alter table conversation_participants enable row level security;

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on messages (conversation_id, created_at desc);

alter table messages enable row level security;

-- ----------------------------------------------------------------------------
-- Membership helper (SECURITY DEFINER to avoid recursive RLS)
-- ----------------------------------------------------------------------------
create or replace function is_conversation_participant(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversation_participants
    where conversation_id = p_conversation_id and user_id = auth.uid()
  );
$$;

-- conversations: only participants can read
create policy "participants read their conversations"
  on conversations for select to authenticated
  using (public.is_conversation_participant(id));

create policy "authenticated users can create a conversation"
  on conversations for insert to authenticated
  with check (created_by = auth.uid());

create policy "participants update their conversation metadata"
  on conversations for update to authenticated
  using (public.is_conversation_participant(id))
  with check (public.is_conversation_participant(id));

-- participants: a user sees participant rows for conversations they are in
create policy "participants read participant rows"
  on conversation_participants for select to authenticated
  using (public.is_conversation_participant(conversation_id));

create policy "conversation creator adds participants"
  on conversation_participants for insert to authenticated
  with check (
    user_id = auth.uid()
    or exists (select 1 from conversations c where c.id = conversation_id and c.created_by = auth.uid())
  );

create policy "users update their own participant row"
  on conversation_participants for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- messages: only participants; no self-messaging (enforced by trigger below)
create policy "participants read messages"
  on messages for select to authenticated
  using (public.is_conversation_participant(conversation_id));

create policy "participants send messages as themselves"
  on messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_conversation_participant(conversation_id));

create or replace function bump_conversation_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update conversations
    set last_message_at = new.created_at,
        last_message_preview = left(new.body, 140)
  where id = new.conversation_id;

  -- notify the other participant(s)
  insert into notifications (user_id, type, title, body, data)
  select cp.user_id, 'message', 'New message', left(new.body, 140),
         jsonb_build_object('conversation_id', new.conversation_id)
  from conversation_participants cp
  where cp.conversation_id = new.conversation_id
    and cp.user_id <> new.sender_id
    and cp.muted = false;

  return new;
end;
$$;

create trigger messages_bump_conversation
  after insert on messages
  for each row execute function bump_conversation_on_message();

-- Prevent a conversation from ever having the same user twice or >2 members.
create or replace function guard_conversation_participants()
returns trigger language plpgsql as $$
declare
  n integer;
begin
  select count(*) into n from conversation_participants where conversation_id = new.conversation_id;
  if n >= 2 then
    raise exception 'Conversations are one-to-one in Hommie V1';
  end if;
  return new;
end;
$$;

create trigger conversation_participants_guard
  before insert on conversation_participants
  for each row execute function guard_conversation_participants();

-- ----------------------------------------------------------------------------
-- enquiries — a student's first contact about a specific accommodation listing.
-- Backed by a conversation; carries a privacy-controlled student summary.
-- ----------------------------------------------------------------------------
create table enquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references accommodation_listings(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  landlord_id uuid not null references profiles(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  message text not null check (char_length(message) between 1 and 2000),

  -- student chooses what to share
  share_move_in boolean not null default true,
  share_budget boolean not null default false,
  share_university boolean not null default true,

  is_read boolean not null default false,
  created_at timestamptz not null default now(),

  unique (listing_id, student_id)
);

create index enquiries_landlord_idx on enquiries (landlord_id, created_at desc);
create index enquiries_listing_idx on enquiries (listing_id, created_at desc);
create index enquiries_student_idx on enquiries (student_id);

alter table enquiries enable row level security;

create policy "student and landlord can read their enquiry"
  on enquiries for select to authenticated
  using (student_id = auth.uid() or landlord_id = auth.uid());

create policy "students create enquiries for themselves"
  on enquiries for insert to authenticated
  with check (
    student_id = auth.uid()
    and public.is_student()
    and exists (
      select 1 from accommodation_listings l
      where l.id = listing_id and l.landlord_id = enquiries.landlord_id and l.status = 'active'
    )
  );

create policy "landlord can mark enquiry read"
  on enquiries for update to authenticated
  using (landlord_id = auth.uid()) with check (landlord_id = auth.uid());

create or replace function on_enquiry_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update accommodation_listings
    set enquiries_count = enquiries_count + 1
  where id = new.listing_id;

  insert into notifications (user_id, type, title, body, data)
  values (new.landlord_id, 'enquiry', 'New enquiry',
          left(new.message, 140),
          jsonb_build_object('enquiry_id', new.id, 'listing_id', new.listing_id));
  return new;
end;
$$;

create trigger enquiries_after_insert
  after insert on enquiries
  for each row execute function on_enquiry_created();

-- A landlord-safe view of the student behind an enquiry: only fields the
-- student agreed to share, plus always-public profile basics.
create or replace view enquiry_student_summaries
with (security_invoker = true)
as
select
  e.id as enquiry_id,
  e.landlord_id,
  p.id as student_id,
  p.first_name,
  p.avatar_url,
  case when e.share_university then u.name end as university,
  case when e.share_university then p.city end as city,
  case when e.share_move_in then p.move_in_from end as move_in_from,
  case when e.share_move_in then p.move_in_to end as move_in_to,
  case when e.share_budget then p.budget_min end as budget_min,
  case when e.share_budget then p.budget_max end as budget_max
from enquiries e
join profiles p on p.id = e.student_id
left join universities u on u.id = p.university_id;
