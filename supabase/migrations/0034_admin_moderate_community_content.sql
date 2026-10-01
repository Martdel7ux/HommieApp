-- ============================================================================
-- Hommie — 0034 — admins can hide reported community content
-- ============================================================================
-- community_posts/community_comments only ever had an "authors update their
-- own" policy — there was no way for an admin to act on a reported post or
-- comment at all (is_hidden was readable/filterable but nothing could ever
-- set it true except the author themselves, who obviously won't hide their
-- own abusive content). The Reports page (0033) needs this to have an actual
-- "Hide" action, not just a status label.

create policy "admins hide community posts"
  on community_posts for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins hide community comments"
  on community_comments for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
