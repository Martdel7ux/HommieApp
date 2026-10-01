-- ============================================================================
-- Hommie — 0032 — let signed-out visitors browse active listings
-- ============================================================================
-- Apple rejection, Guideline 5.1.1(v): "the app requires users to register
-- before accessing and browsing information in the Home and Search."
--
-- The app-side routing gate is being relaxed separately (AuthGate.tsx), but
-- that alone does nothing — `accommodation_listings` and
-- `accommodation_listing_images` only ever granted SELECT `to authenticated`,
-- so a signed-out request would just get an empty result set back from
-- Supabase regardless of what the app screen does. The 0003 migration's own
-- comment already said "Public can see active listings" — this migration
-- actually makes that true, by adding a second, narrower permissive policy
-- for the `anon` role (RLS policies for the same command OR together, so the
-- existing `authenticated` policy is untouched).
--
-- Scope is deliberately narrow: only `status = 'active'` rows, no landlord's
-- own non-active listings (there's no session to scope those to for anon
-- anyway). Nothing else changes — `profiles`/`landlord_profiles` stay
-- authenticated-only, so a guest's listing card/detail query simply gets
-- `landlord: null` back for the nested embed (PostgREST omits relations RLS
-- denies rather than erroring the whole row), which the app already handles
-- (see `app/accommodation/[id].tsx`'s `d.landlord ? … : null` and the
-- `disabled={!d.landlord}` contact button).

create policy "active listings are readable by anyone"
  on accommodation_listings for select
  to anon
  using (status = 'active');

create policy "listing images of active listings are readable by anyone"
  on accommodation_listing_images for select
  to anon
  using (
    exists (
      select 1 from accommodation_listings l
      where l.id = listing_id and l.status = 'active'
    )
  );
