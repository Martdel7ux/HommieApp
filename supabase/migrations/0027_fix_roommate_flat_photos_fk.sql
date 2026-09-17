-- ============================================================================
-- Hommie — 0027 — fix roommate_flat_photos relationship for PostgREST embeds
-- ============================================================================
-- 0025 pointed roommate_flat_photos.user_id at profiles(id). PostgREST can
-- only auto-embed a relationship when there's a foreign key directly between
-- the two tables in the query (roommate_preferences -> roommate_flat_photos),
-- not merely a shared parent (both referencing profiles) — this broke
-- `roommatesApi.getMine()`'s `flat_photos:roommate_flat_photos(...)` embed
-- with PGRST200 ("Could not find a relationship"). roommate_preferences.user_id
-- is already unique, so it's a valid FK target.

alter table roommate_flat_photos
  drop constraint if exists roommate_flat_photos_user_id_fkey;

alter table roommate_flat_photos
  add constraint roommate_flat_photos_user_id_fkey
  foreign key (user_id) references roommate_preferences (user_id) on delete cascade;
