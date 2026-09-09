# Welcome email — setup

A new user gets a one-off **"Welcome to Hommie"** email in the background. It does
**not** gate access — the user is in the app immediately; the email just lands a
moment later.

- Function: `supabase/functions/welcome-email/index.ts` (Deno edge function)
- Trigger: a **Database Webhook** on `auth.users` INSERT
- Sender: **Resend** (https://resend.com) — free tier is 3,000 emails/mo, 100/day

The function is inert until `RESEND_API_KEY` is set, so it's safe to deploy now
and finish the wiring later.

---

## 1. Resend

1. Create a Resend account.
2. **Domains → Add domain** → `hommieapp.com` (or a subdomain like `mail.hommieapp.com`).
   Add the DNS records Resend gives you (SPF/DKIM). Wait for "Verified".
3. **API Keys → Create** → copy the key (`re_…`). Scope: "Sending access".

Until the domain is verified you can test with Resend's sandbox sender
`onboarding@resend.dev` (only delivers to your own Resend account email).

## 2. Deploy the function

```
cd ~/Desktop/hommieapp
supabase functions deploy welcome-email --no-verify-jwt --project-ref ywleliavgtumbafptwci
```

## 3. Function secrets

```
supabase secrets set --project-ref ywleliavgtumbafptwci \
  RESEND_API_KEY=re_xxxxxxxx \
  WELCOME_EMAIL_FROM="Hommie <hello@hommieapp.com>" \
  WEBHOOK_SECRET=$(openssl rand -hex 24)
```

Keep the `WEBHOOK_SECRET` value — you need it in the next step. (It's optional;
omit it and the header check is skipped, but the function URL is then callable by
anyone who finds it.)

## 4. Database Webhook

Supabase dashboard → **Database → Webhooks → Create a new hook**:

| Field | Value |
| --- | --- |
| Name | `welcome-email` |
| Table | `auth.users` |
| Events | **Insert** only |
| Type | **Supabase Edge Functions** → `welcome-email` |
| HTTP Headers | add `x-webhook-secret` = the `WEBHOOK_SECRET` from step 3 |

Save.

> If `auth.users` isn't selectable in the table dropdown, use **HTTP Request**
> type instead, method `POST`, URL
> `https://ywleliavgtumbafptwci.supabase.co/functions/v1/welcome-email`, and add
> both `x-webhook-secret` and `Authorization: Bearer <anon key>` headers.

### Or wire it in SQL (reproducible)

```sql
create trigger send_welcome_email
  after insert on auth.users
  for each row execute function supabase_functions.http_request(
    'https://ywleliavgtumbafptwci.supabase.co/functions/v1/welcome-email',
    'POST',
    '{"Content-Type":"application/json","x-webhook-secret":"<WEBHOOK_SECRET>"}',
    '{}',
    '5000'
  );
```

## 5. Test

```
supabase functions invoke welcome-email --project-ref ywleliavgtumbafptwci \
  --body '{"type":"INSERT","table":"users","record":{"email":"you@example.com","raw_user_meta_data":{"first_name":"Sam","role":"student"}}}'
```

Then create a real account in the app and confirm the email arrives. Check
**Resend → Logs** and the function logs (`supabase functions logs welcome-email`).

## Notes

- The function always returns HTTP 200 (even on a Resend error) so a mail hiccup
  never blocks signup. Failures show in the function logs + Resend logs.
- `raw_user_meta_data` carries `first_name` / `role` for password signups and
  `given_name` / `name` for Google. The email greeting + copy adapt to the role.
- To change the email, edit `renderEmail()` in the function and redeploy.
