-- ============================================================================
-- Hommie — 0017 — jobs: optional contact phone for the "Call Office" action
-- ============================================================================
alter table jobs add column if not exists contact_phone text
  check (contact_phone is null or char_length(contact_phone) <= 32);
