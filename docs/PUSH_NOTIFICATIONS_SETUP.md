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

**Doing Android first?** Steps 1, 3, 4, 5, 6, 7 — skip step 2 (iOS). Android
needs no Apple account.

---

## 1. EAS project (shared by iOS + Android)

You'll need a free **Expo account** (expo.dev). Then:

```
cd ~/Desktop/hommieapp
npm i -g eas-cli
eas login
eas init          # pick / create the "hommie" project; writes the project id
```

Put the id it prints into `.env`:

```
EAS_PROJECT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

`app.config.ts` already reads it into `extra.eas.projectId`, which
`getExpoPushTokenAsync` needs. Rebuild the dev client afterwards so it's baked in.

## 2. iOS credentials — *skip if doing Android only*

Blocked on the paid Apple Developer Program membership.

```
eas credentials -p ios
# → "Push Notifications: Manage your Apple Push Notifications Key"
# → let EAS create + upload the APNs key (.p8)
```

Rebuild: `eas build -p ios --profile development` (or the local Xcode build).

## 3. Android — Firebase + FCM

You already have a **Google Cloud project** from the Google Sign-In setup
(client id `94071834566-…`). Firebase attaches to that same project — you don't
need a new one.

### 3a. Add Firebase to the project

1. <https://console.firebase.google.com> → **Add project** → on the first screen,
   the dropdown lets you **pick your existing Google Cloud project** (the one
   with the `94071834566` clients). Select it → continue → (Analytics optional,
   can disable) → Create.

### 3b. Register the Android app

1. In the project, **Add app → Android**.
2. **Android package name:** `com.hommie.app`
3. **Debug signing certificate SHA-1** (optional here, but paste it):
   `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
   (this project's bundled `android/app/debug.keystore`; get it fresh with
   `keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android`)
4. **Download `google-services.json`** → drop it at the **repo root**
   (`~/Desktop/hommieapp/google-services.json`). It's gitignored;
   `app.config.ts` auto-detects it and wires `android.googleServicesFile`.
   For EAS cloud builds also run:
   `eas secret:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json`
   (or commit it — it's client config, low-risk on a private repo).

### 3c. FCM service-account key → Expo

1. Firebase → **Project settings → Service accounts → Generate new private key**
   → downloads a `*-firebase-adminsdk-*.json` (gitignored; keep it safe — this
   one *is* a secret).
2. Upload it to Expo:
   ```
   eas credentials -p android
   # → "Google Service Account"
   #   → "Manage your Google Service Account Key for Push Notifications (FCM V1)"
   #   → "Set up a Google Service Account Key" → point at that JSON
   ```

### 3d. Build

```
eas build -p android --profile development      # cloud APK
eas build:run -p android --latest              # install on an emulator/device
```
or locally: `npx expo prebuild -p android --clean && npx expo run:android`.

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

---

## 8. Web push (separate from everything above)

Expo's push service has no documented delivery path to a browser (its docs
only cover FCM/APNs), so web bypasses `exp.host` entirely and uses the Web
Push protocol (VAPID) directly — a second, independent pipeline:

- `public/push-worker.js` — the service worker; receives the push and
  shows/routes it, works even if the tab/app isn't open
- `src/features/notifications/push.ts`'s web branch — subscribes the
  browser and stores the subscription in `push_tokens`
  (`web_push_endpoint` / `web_push_keys`, added by migration 0035)
- `supabase/functions/push-notify`'s web branch — sends via `npm:web-push`
  instead of `exp.host` for those rows

A VAPID key pair has already been generated for this and is sitting in
`.env` (gitignored): `EXPO_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`VAPID_SUBJECT`. Three things still need doing to make it live:

### 8a. Apply migration 0035

`supabase/migrations/0035_web_push_subscriptions.sql` adds the web
subscription columns. Apply with `python3 scripts/db-apply.py migrations`
(or `supabase db push` once `supabase link` is set up).

### 8b. Push the VAPID secrets to the edge function

The private key must never go in the app bundle — only `.env`'s
`EXPO_PUBLIC_VAPID_PUBLIC_KEY` ships to the client. Push all three to the
function's own secrets (reading straight from `.env` so nothing gets
retyped):

```
set -a; source .env; set +a
supabase secrets set --project-ref ywleliavgtumbafptwci \
  VAPID_PUBLIC_KEY="$EXPO_PUBLIC_VAPID_PUBLIC_KEY" \
  VAPID_PRIVATE_KEY="$VAPID_PRIVATE_KEY" \
  VAPID_SUBJECT="$VAPID_SUBJECT"
```

### 8c. Redeploy the function

```
supabase functions deploy push-notify --no-verify-jwt --project-ref ywleliavgtumbafptwci
```

### 8d. Test on web

1. Open the web app (needs a real HTTPS origin or `localhost` — service
   workers refuse to register anywhere else), sign in → Profile →
   Notifications → turn **Push notifications** on → accept the browser's
   permission prompt.
2. Check a `push_tokens` row appears with `platform = 'web'` and
   `web_push_endpoint` set.
3. From a second account, send a message to the first. A real OS-level
   browser notification should arrive, including with the tab closed;
   clicking it opens/focuses the app at the right screen.

Safari doesn't support the standard Push API/VAPID yet — the toggle just
silently does nothing there for now (`registerWebPushToken` returns `null`,
no error shown).
