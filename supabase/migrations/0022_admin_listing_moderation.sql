-- Admins can see and moderate any accommodation listing regardless of
-- status, mirroring the existing admin policy on jobs (0016_jobs.sql).
-- Additive: existing landlord/public policies on accommodation_listings are
-- untouched (Postgres ORs multiple permissive policies together).
create policy "admins manage listings"
  on accommodation_listings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
