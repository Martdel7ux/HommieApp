-- ============================================================================
-- Hommie — 0001 — extensions, enums, shared helper functions
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type user_role as enum ('student', 'landlord');

create type student_status as enum (
  'new_to_cyprus',
  'looking_for_accommodation',
  'looking_for_roommate',
  'already_settled'
);

create type study_level as enum (
  'foundation',
  'undergraduate_y1',
  'undergraduate_y2',
  'undergraduate_y3',
  'undergraduate_y4',
  'postgraduate',
  'phd',
  'erasmus_exchange'
);

create type property_type as enum (
  'studio',
  'apartment',
  'house',
  'shared_room',
  'private_room'
);

create type listing_status as enum ('draft', 'active', 'paused', 'rented', 'archived');

create type verification_status as enum ('unverified', 'submitted', 'verified');

create type community_category as enum (
  'housing_help',
  'new_in_cyprus',
  'campus_life',
  'recommendations',
  'general'
);

create type marketplace_category as enum (
  'furniture',
  'electronics',
  'books',
  'kitchen',
  'transport',
  'other'
);

create type marketplace_condition as enum ('new', 'like_new', 'good', 'fair', 'for_parts');

create type conversation_context as enum ('accommodation', 'roommate', 'marketplace', 'general');

create type report_reason as enum (
  'spam',
  'scam_or_fraud',
  'inappropriate',
  'harassment',
  'wrong_category',
  'not_available',
  'other'
);

create type report_status as enum ('open', 'reviewing', 'actioned', 'dismissed');

create type notification_type as enum (
  'message',
  'enquiry',
  'listing_saved',
  'roommate_saved',
  'community_reply',
  'community_like',
  'event_reminder',
  'system'
);

create type landlord_application_status as enum ('pending', 'approved', 'rejected');

-- ----------------------------------------------------------------------------
-- Helper functions
-- ----------------------------------------------------------------------------

-- Generic updated_at trigger.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- NOTE: the role helper functions (current_user_role / is_student / is_landlord /
-- is_admin) are defined in 0002, immediately after the `profiles` table they read
-- from — an SQL function's body is validated against existing objects at CREATE
-- time, so they cannot live here.
