# Social sign-in (Apple + Google) — setup

The code is done. Apple / Google buttons show on **Sign in** and **Sign up**
(`src/features/auth/SocialAuthButtons.tsx`). They use the native provider sheets
and exchange the result for a Supabase session with
`supabase.auth.signInWithIdToken` — the App-Store-compliant path (Guideline 4.8).

**This needs a native build** (`npx expo run:ios`), not Expo Go. In Expo Go the
buttons hide themselves and the rest of the app keeps working.

Everything below is credentials + dashboard config. Nothing here is code.

Prerequisites:
- **Apple Developer Program** membership ($99/yr) — required for Sign in with Apple.
- A Google account for Google Cloud Console (free).
- Owner access to the Supabase project `ywleliavgtumbafptwci`.

---

## Step 1 — Apply migration 0015 to the database

`supabase/migrations/0015_social_auth.sql` teaches the new-user trigger to read
the name/avatar that Google & Apple send, and adds `apply_selected_role()` so a
social sign-up gets the role picked on the welcome screen.

**Easiest way — SQL editor:**
1. Supabase dashboard → your project → **SQL Editor** → **New query**.
2. Open `supabase/migrations/0015_social_auth.sql`, copy the whole file, paste, **Run**.
3. It should say "Success. No rows returned".

**Or with the script** (records it in the migration history):
1. https://supabase.com/dashboard/account/tokens → **Generate new token**, copy it (`sbp_…`).
2. ```
   cd ~/Desktop/hommieapp
   SUPABASE_ACCESS_TOKEN=sbp_xxx SUPABASE_PROJECT_REF=ywleliavgtumbafptwci \
     python3 scripts/db-apply.py migrations
   ```
   Expect `✓ 0015_social_auth.sql`.

---

## Step 2 — Apple: enable "Sign in with Apple" on `com.hommie.app`

### 2a. Enable the capability on the App ID
1. https://developer.apple.com/account → **Certificates, Identifiers & Profiles** → **Identifiers**.
2. If `com.hommie.app` is **not** in the list:
   **＋** → **App IDs** → **App** → Continue →
   Description `Hommie`, Bundle ID **Explicit** → `com.hommie.app` → Continue → Register.
3. Click **`com.hommie.app`** in the list.
4. Scroll to **Sign In with Apple** → tick the checkbox. Leave it as
   "Enable as a primary App ID". → **Save** → confirm.

That is all the native iOS flow needs from Apple.

### 2b. Tell Supabase to trust the app
1. Supabase dashboard → **Authentication** → **Sign In / Providers** → **Apple**.
2. Turn Apple **on**.
3. **Authorized Client IDs** → add `com.hommie.app`.
4. Leave **Secret Key (for OAuth)** blank — it's only for the web/Android flow,
   which we don't use (the Apple button is iOS-only).
5. **Save**.

### 2c. (Skip unless you later want Apple sign-in on Android or the web)
Create a **Services ID** (`com.hommie.app.web`), a **Sign in with Apple Key**
(download the `.p8` once), then fill Supabase's "Secret Key (for OAuth)" with the
generated client-secret JWT. Not needed now.

---

## Step 3 — Google

### 3a. Google Cloud project + consent screen
1. https://console.cloud.google.com → project picker → **New Project** → `Hommie` → Create.
2. **APIs & Services** → **OAuth consent screen**:
   - User type **External** → Create.
   - App name `Hommie`, user support email = yours, developer contact = yours → Save and continue.
   - Scopes: the defaults (`openid`, `.../userinfo.email`, `.../userinfo.profile`) are enough → Save and continue.
   - Test users: add your own Google address (while the app is in "Testing",
     only listed users can sign in) → Save. You can "Publish app" later.

### 3b. Create THREE OAuth client IDs
**APIs & Services → Credentials → ＋ Create credentials → OAuth client ID**, three times:

**1) Web application**
- Name: `Hommie Web (Supabase)`
- **Authorized redirect URIs** → Add:
  `https://ywleliavgtumbafptwci.supabase.co/auth/v1/callback`
- Create → copy the **Client ID** and **Client secret**.

**2) iOS**
- Application type **iOS**
- Name: `Hommie iOS`
- Bundle ID: `com.hommie.app`
- Create → copy the **Client ID**. On the client's detail page note the
  **iOS URL scheme** — it's the client ID with its parts reversed, like
  `com.googleusercontent.apps.1234567890-abcdef`.

**3) Android**
- Application type **Android**
- Name: `Hommie Android`
- Package name: `com.hommie.app`
- **SHA-1 certificate fingerprint**: the debug build uses your local debug
  keystore. Get it with:
  ```
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey \
    -storepass android -keypass android | grep SHA1
  ```
  (For release/Play Store you'll add the Play App Signing SHA-1 later.)
- Create. Nothing to copy — Google matches Android by package + SHA-1.

### 3c. Supabase → Providers → Google
1. Authentication → Providers → **Google** → on.
2. **Client ID** = the **Web** client ID from 3b‑1.
3. **Client Secret** = the **Web** client secret.
4. **Skip nonce checks** → turn **ON**. `@react-native-google-signin/google-signin`'s
   classic `signIn()` (what `src/features/auth/social.ts` uses) has no way to
   set or read a nonce, but Google's native iOS SDK embeds one in the ID token
   anyway — with this off, Supabase rejects the token with "Passed nonce and
   nonce in id_token should either both exist or not."
5. Save.

### 3d. Put the values in `.env`
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1234567890-web.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=1234567890-ios.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME=com.googleusercontent.apps.1234567890-ios
```
The Google button only appears once `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is set.
`EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` is read at prebuild — set it **before** the
build in step 4.

---

## Step 4 — Build & run the dev build

You have Xcode, so build locally (no Expo/EAS account, no cost, installs to the
simulator you already use):

```
cd ~/Desktop/hommieapp
npx expo run:ios          # first run also does `expo prebuild` + pod install (~5 min)
```
This produces a **Hommie** dev build on the simulator (replacing Expo Go for this
project). Afterwards, day to day:
```
npx expo start --dev-client
```
and press `i`, or relaunch the installed Hommie app.

- Regenerate native dirs after any `app.config.ts` / plugin / env-scheme change:
  `npx expo prebuild --clean` then `npx expo run:ios`.
- `ios/` and `android/` are gitignored on purpose — they're generated.
- Android: `npx expo run:android` (needs Android Studio + an emulator).

**Cloud build instead** (for a shareable build or a physical device):
```
npm i -g eas-cli && eas login && eas init
# add  "ios": { "simulator": true }  to the "development" profile in eas.json for a sim build
eas build --profile development --platform ios
eas build:run -p ios --latest
```

---

## Step 5 — Test

Open the dev build → **Sign in**:

- **Google** → account picker → new user lands in onboarding, returning user in Home.
- **Apple** → native sheet. In the **simulator** this only works if the simulator
  is signed into an Apple ID (Settings app → Sign in). Then same as above.
- New social user who picked **"I'm a Landlord"** on the welcome screen → confirm
  `profiles.role = 'landlord'` and a `landlord_profiles` row exists (Supabase → Table editor).
- Apple returns the name **only on the first authorization**. To re-test the
  name path: <https://account.apple.com/account/manage> → Sign in with Apple →
  Hommie → Stop using, then sign in again.

## Notes / gotchas

- **Account linking**: with Supabase's default (link identity when the email
  matches and is confirmed), a Google sign-in for an address that already has a
  password account links to it. A user who instead hits `email_exists` registered
  with email/password first — the error copy already tells them to use that.
- `authApi.signOut()` also calls `GoogleSignin.signOut()` so the next tester gets
  the account picker instead of being logged straight back in.
- The AsyncStorage **session-injection trick** used for screenshots changes paths
  with a standalone dev build (the app has its own container, not
  `ExponentExperienceData/@anonymous/…`).
