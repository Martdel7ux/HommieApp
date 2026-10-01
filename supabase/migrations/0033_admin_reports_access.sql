-- ============================================================================
-- Hommie — 0033 — let admins actually see and act on reports
-- ============================================================================
-- `reports` (0007) only ever had a "read your own reports" policy — nobody,
-- including admins, could see reports OTHER people filed. That meant the
-- auto-report migration 0026/messaging/api.ts added for blocking a user
-- (satisfying App Review Guideline 1.2's "blocking should notify the
-- developer") only ever produced a row nobody could read. This migration is
-- what actually makes that notification real: an admin-facing page in
-- admin-web now reads from here.

create policy "admins read all reports"
  on reports for select
  to authenticated
  using (public.is_admin());

create policy "admins update reports"
  on reports for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
