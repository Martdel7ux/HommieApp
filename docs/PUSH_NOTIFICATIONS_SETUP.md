# Push notifications — setup

The app already:

- registers the device's **Expo push token** on sign-in
  (`src/features/notifications/push.ts`), keyed to the user in `push_tokens`
- asks for the OS permission when the user turns "Push notifications" on
  (`app/profile/notifications.tsx`), with an "Open Settings" fallback if denied
- refreshes the in-app list when a push lands in the foreground, and **deep
  links** on tap / cold start (`src/components/PushBootstrap.tsx`)
- deletes the token on sign-out
- ships an edge function (`supabase/functions/push-notify`) that fans a new
  `notifications` row out to the user's devices, respecting `notification_prefs`

Every part is a **safe no-op** until the pieces below exist, so this is already
merged.

---

## What's blocking real delivery

| | Needs | Status |
| --- | --- | --- |
| EAS project id (`getExpoPushTokenAsync`) | `eas init` (Expo account, free) | ☐ |
| iOS delivery | **APNs key** — needs the paid **Apple Developer Program** membership (same blocker as Apple Sign-In) | ☐ |
| Android delivery | **FCM** — a Firebase project + the FCM v1 service-account JSON | ☐ |
| Server send | deploy `push-notify` + a Database Webhook | ☐ |

Expo Go **cannot** get a push token (removed in SDK 53). Use the dev build.

---

## 1. EAS project

```
cd ~/Desktop/hommieapp
npm i -g eas-cli && eas login
eas init                       # creates the project, writes the id
```

`eas init` prints a project id — put it in `.env` as `EAS_PROJECT_ID=...`
(`app.config.ts` already reads it into `extra.eas.projectId`). Rebuild the dev
client so the value is baked in.

## 2. iOS credentials (blocked on Apple Developer membership)

```
eas credentials -p ios
# → "Push Notifications: Manage your Apple Push Notifications Key"
# → Let EAS create / upload the APNs key (.p8)
```

Then rebuild: `eas build -p ios --profile development` (or the local Xcode build).

## 3. Android credentials

1. Firebase console → add a project (or reuse the Google Cloud one) → add an
   Android app with package `com.hommie.app`.
2. Download **`google-services.json`** → put it at the repo root; add to
   `app.config.ts` android config: `"googleServicesFile": "./google-services.json"`.
3. Project settings → Service accounts → **Generate new private key** → save the JSON.
4. `eas credentials -p android` → "Google Service Account" → "Manage your FCM V1
   service account key" → upload that JSON.
5. Rebuild: `eas build -p android --profile development`.

## 4. Deploy the send function

```
supabase functions deploy push-notify --no-verify-jwt --project-ref ywleliavgtumbafptwci
supabase secrets set --project-ref ywleliavgtumbafptwci \
  WEBHOOK_SECRET=$(openssl rand -hex 24)
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

## 5. Database Webhook

Dashboard → **Database → Webhooks → Create**:

| Field | Value |
| --- | --- |
| Name | `push-notify` |
| Table | `public.notifications` |
| Events | **Insert** |
| Type | Supabase Edge Functions → `push-notify` |
| HTTP Headers | `x-webhook-secret` = the `WEBHOOK_SECRET` from step 4 |

Or in SQL:

```sql
create trigger send_push
  after insert on public.notifications
  for each row execute function supabase_functions.http_request(
    'https://ywleliavgtumbafptwci.supabase.co/functions/v1/push-notify',
    'POST',
    '{"Content-Type":"application/json","x-webhook-secret":"<WEBHOOK_SECRET>"}',
    '{}',
    '5000'
  );
```

## 6. Apply migration 0019

`supabase/migrations/0019_enquiry_notification_conversation.sql` adds
`conversation_id` to the "New enquiry" notification so its push deep-links to
the thread. Apply with `supabase db push` (or the SQL editor).

## 7. Test

On a **dev build** on a real device (or a simulator with a dev build + the APNs
key for iOS):

1. Sign in → Profile → Notifications → turn **Push notifications** on → accept
   the OS prompt. Check a `push_tokens` row appears (Table editor).
2. Send yourself a test push:
   ```
   npx expo push:android:send --to "<ExponentPushToken[...]>" --title "Hi" --body "test"
   # or use https://expo.dev/notifications
   ```
3. From a second account, send a message / enquiry to the first. The first
   device should get a push; tapping it opens the conversation.
4. Turn a category off in settings → that type stops arriving; `push` off stops
   all of them.

## Notes

- The function prunes tokens Expo reports as `DeviceNotRegistered`.
- Foreground behaviour is set in `push.ts` (`setNotificationHandler`) — banner +
  list + sound, no badge.
- `notification-icon.png` + the accent colour are already in the
  `expo-notifications` plugin block in `app.config.ts`.
