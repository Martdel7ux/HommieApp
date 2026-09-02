# Social sign-in (Apple + Google) — setup

The code is done. Apple / Google buttons appear on **Sign in** and **Sign up**
(`src/features/auth/SocialAuthButtons.tsx`). They use the native provider sheets
and hand Supabase an ID token via `supabase.auth.signInWithIdToken` — this is the
App-Store-compliant path (Guideline 4.8) and it needs a **development build**, not
Expo Go. In Expo Go the buttons are hidden automatically.

Nothing below is code. It is credentials + dashboard config. Until it's done the
buttons stay hidden (Google) or fail at the provider sheet (Apple).

---

## 1. Apple

### Apple Developer portal
1. **Certificates, IDs & Profiles → Identifiers →** the App ID `com.hommie.app`
   → enable the **Sign in with Apple** capability → Save.
2. **Keys → +** → name it "Hommie Sign in with Apple", enable **Sign in with
   Apple**, configure it against the primary App ID `com.hommie.app`, then
   **download the `.p8` key once** and note the **Key ID** and your **Team ID**.
3. (Only needed for the Supabase secret, step below) Create a **Services ID**
   e.g. `com.hommie.app.signin`, enable Sign in with Apple on it, and set the
   return URL to `https://ywleliavgtumbafptwci.supabase.co/auth/v1/callback`.

### Supabase → Authentication → Providers → Apple
- Toggle **Enable**.
- **Authorized Client IDs**: `com.hommie.app` (the app bundle id — this is what
  the native flow sends).
- **Secret Key (for OAuth)**: generate the client secret JWT from the `.p8`
  (Team ID, Key ID, Services ID). Supabase's docs have a generator snippet;
  it expires every 6 months, so set a calendar reminder.
- Save.

### App config — already done
`app.config.ts` sets `ios.usesAppleSignIn: true` and adds the
`expo-apple-authentication` plugin.

---

## 2. Google

### Google Cloud Console → the project linked to Supabase
Create **APIs & Services → Credentials → Create credentials → OAuth client ID**
**three times**:

| Type | Used for | Where the value goes |
|------|----------|----------------------|
| **Web application** | Supabase + `GoogleSignin` `webClientId` | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` **and** Supabase provider "Client ID" |
| **iOS** (bundle id `com.hommie.app`) | native iOS sign-in | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` |
| **Android** (package `com.hommie.app` + SHA-1 of the signing key) | native Android sign-in | nothing to paste; Google matches it by package + SHA-1 |

- For the **Web** client, add the redirect URI
  `https://ywleliavgtumbafptwci.supabase.co/auth/v1/callback`.
- The **iOS URL scheme** shown in the iOS client details
  (`com.googleusercontent.apps.XXXXXXXX`) →
  `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` (build-time only, consumed by the
  `@react-native-google-signin/google-signin` config plugin).
- Get the Android SHA-1 from the EAS keystore:
  `eas credentials` → Android → the SHA-1 fingerprint.

### Supabase → Authentication → Providers → Google
- Toggle **Enable**.
- **Client ID**: the **Web** client id from above.
- **Client Secret**: the Web client secret.
- **Skip nonce check**: leave **off**.
- Save.

### `.env`
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...apps.googleusercontent.com   # Web client
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...apps.googleusercontent.com   # iOS client
EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME=com.googleusercontent.apps...  # iOS client reversed
```
The Google button only renders when `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is set.

---

## 3. Database migration

`supabase/migrations/0015_social_auth.sql`:
- teaches `handle_new_user()` to read the name / avatar claims Google & Apple put
  in `raw_user_meta_data`;
- adds `apply_selected_role(p_role)` — a security-definer RPC the app calls right
  after a social sign-up so the account gets the role picked on the welcome
  screen (bounded to pre-onboarding accounts, so it can't escalate later).

Apply it: `SUPABASE_ACCESS_TOKEN=... SUPABASE_PROJECT_REF=ywleliavgtumbafptwci python3 scripts/db-apply.py migrations`

---

## 4. Build & test

```
npx expo install expo-dev-client      # already in package.json
eas build --profile development --platform ios     # (and --platform android)
```
Install the dev build, run `npx expo start --dev-client`, open Sign in:

- **Apple** → native sheet → lands in onboarding (new) or home (returning).
- **Google** → account picker → same.
- New social user picking "I'm a Landlord" on welcome → ends up as a landlord
  (check `profiles.role` + a `landlord_profiles` row exists).
- Apple only returns the user's name on the **first** authorization — to re-test,
  remove the app from the Apple ID at
  <https://account.apple.com/account/manage> → Sign in with Apple.

## Notes / gotchas

- **Account linking**: with Supabase's default "link identity if email matches +
  confirmed", a Google sign-in for an email that already has a password account
  links to it. If a user hits `email_exists`, they registered with email/password
  first — tell them to sign in that way (already handled in `errors.ts`).
- `authApi.signOut()` also calls `GoogleSignin.signOut()` so the next tester sees
  the account picker rather than being auto-logged straight back in.
- Android needs no extra manifest entries; the google-signin config plugin adds
  what's required at prebuild.
