# Hommie

Student life in Cyprus — accommodation, roommates, events, community and second-hand
essentials for university students, plus a simple trusted workspace for landlords.

- **Stack:** React Native + Expo (SDK 57) + TypeScript, Expo Router, TanStack Query,
  React Hook Form + Zod, Supabase (Auth, Postgres, Storage, Realtime, RLS).
- **Platforms:** iOS and Android from day one.
- **Target public launch:** 11 October 2026.

---

## 1. Prerequisites

| Tool | Version |
| --- | --- |
| Node | 20+ (tested on 24) |
| npm | 10+ |
| Expo CLI | via `npx expo` (no global install needed) |
| Supabase CLI | `brew install supabase/tap/supabase` (for local DB) |
| Xcode | 15+ (iOS simulator) |
| Android Studio | Hedgehog+ (Android emulator) |

This project sets `legacy-peer-deps=true` in `.npmrc` — required because a few
Expo Router transitive deps declare narrow React peer ranges.

---

## 2. First-time setup

```bash
npm install
cp .env.example .env        # then fill in the values (see below)
```

### Environment variables (`.env`)

| Key | Required | Notes |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | ✅ | From Supabase project settings (or `http://localhost:54321` for local). |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ✅ | The **anon** key. Safe to ship. |
| `EXPO_PUBLIC_ANALYTICS_ENABLED` | – | `true`/`false`. When false, events are collected & validated but not forwarded. |
| `EXPO_PUBLIC_ENV` | – | `development` / `preview` / `production`. |
| `EAS_PROJECT_ID` | – | For EAS builds. |
| `SUPABASE_SERVICE_ROLE_KEY` | – | **Server/CLI only.** Never imported by any file in `app/` or `src/`. |

> 🔒 The service-role key must never appear in `app.config.ts` `extra`, in any
> `EXPO_PUBLIC_*` variable, or anywhere the bundler can see it.

---

## 3. Supabase

Dev currently runs against a **hosted project** (`.env` points at it). The schema,
RLS, storage buckets, realtime and the Cyprus seed data are already applied, and
Auth is configured with `mailer_autoconfirm` on + the `hommie://` redirect URLs.

### Seeded demo accounts

All seeded users share the password **`Passw0rd!`**.

| Role | Email |
| --- | --- |
| Student | `maria.student@hommie.test` |
| Student | `andreas.student@hommie.test` |
| Landlord (verified) | `costas.landlord@hommie.test` |
| Landlord (business) | `nicosia.rentals@hommie.test` |
| Admin (can create events) | `team@hommie.test` |

### Applying migrations / seed to the hosted project

Preferred (needs the DB password once):

```bash
supabase link --project-ref <ref>          # prompts for the DB password
supabase db push --linked --include-seed --yes
```

Fallback with no DB password — uses the Management API + a personal access token:

```bash
SUPABASE_ACCESS_TOKEN=sbp_...  SUPABASE_PROJECT_REF=<ref>  \
  python3 scripts/db-apply.py migrations    # applies only un-applied migrations
SUPABASE_ACCESS_TOKEN=sbp_...  SUPABASE_PROJECT_REF=<ref>  \
  python3 scripts/db-apply.py verify
```

Do **not** run the seed against production.

### Local Supabase (optional)

```bash
supabase start && supabase db reset        # needs Docker; Studio on :54323
```

Then point `.env` at the local `API URL` + `anon key` that `supabase start` prints.

### Regenerating DB types

```bash
npm run db:types    # supabase gen types typescript --local > src/types/database.ts
```

Until you run this, `src/types/database.ts` is a hand-maintained mirror of the
migrations and is the source of truth for the client.

---

## 4. Run the app

```bash
npm run start          # Expo dev server (press i / a)
npm run ios            # iOS simulator
npm run android        # Android emulator
```

Deep-link scheme: `hommie://`. Auth callback route: `hommie:///auth/callback`.

---

## 5. Quality checks

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # eslint (flat config, eslint-config-expo)
npm run format         # prettier --write
npx expo export --platform ios       # full bundle smoke test
npx expo export --platform android
npx expo-doctor
```

---

## 6. Project structure

```
app/                      Expo Router routes
  (auth)/                 welcome (role selection), sign-in, sign-up, verify-email,
                          forgot/reset password, callback
  onboarding/             student (multi-step), landlord
  (student)/              tabs: home, explore, messages, community, profile
  (landlord)/             tabs: dashboard, listings, enquiries, messages, profile
src/
  components/ui/          design-system primitives (Text, Button, TextField, Screen,
                          Card, Badge, Avatar, Banner, Chip, Select, States)
  components/             ErrorBoundary, ComingSoon
  features/               auth/, profile/  (feature-scoped logic + screens)
  services/               analytics/ (typed event catalogue), logger, errors
  lib/                    supabase client, queryClient + query keys, storage adapters
  hooks/                  shared hooks
  config/                 env, constants (enums), labels
  theme/                  colors, typography, spacing, shadows  (⚠ placeholder tokens)
  types/                  database.ts (schema mirror)
supabase/
  migrations/             0001–0010 — schema, RLS, storage, realtime, functions
  seed.sql                Cyprus student-life seed data
  config.toml             local Supabase config
```

---

## 7. Architecture notes

- **Roles.** `type UserRole = "student" | "landlord"` is chosen at sign-up, stored on
  `profiles.role`, and enforced in **both** the app (`AuthGate`, `is_student()`/
  `is_landlord()` checks) **and** RLS policies. V1 has no free role switching — a
  student uses the "Apply to become a landlord" flow (`landlord_applications`).
- **Navigation guard.** `src/features/auth/AuthGate.tsx` is the single source of
  routing truth: signed-out → `(auth)`, unverified → verify-email, onboarding
  incomplete → `onboarding/<role>`, otherwise the role's tab group.
- **Server state** goes through TanStack Query with an AsyncStorage persister; all
  cache keys live in `src/lib/queryClient.ts` (`qk`).
- **Validation:** every form uses React Hook Form + a Zod schema (`features/*/schemas.ts`).
- **Errors:** `services/errors.ts` normalises any thrown value to a user-safe
  `AppError`; `guard()` wraps API calls with logging.
- **Analytics:** `services/analytics` — a typed event catalogue
  (`events.ts`) and a provider interface. Disabled by default; call sites already
  emit named events so turning it on is a one-line change in `app/_layout.tsx`.
- **Security:** anon key only in the client; RLS is the real boundary; storage
  buckets are owner-scoped by path (`<bucket>/<uid>/…`); private property
  addresses are never exposed publicly (only `approx_lat/lng` + area).

---

## 8. Build & release

### EAS builds

```bash
npm i -g eas-cli
eas login
eas init                       # writes EAS project id
eas build --profile preview --platform all       # internal test builds
eas build --profile production --platform all    # store builds
```

Profiles are defined in `eas.json`. Set EAS **secrets** for the production
Supabase URL/anon key:

```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value https://<ref>.supabase.co
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon-key>
```

### TestFlight / Android beta

```bash
eas build --profile production --platform ios && eas submit --platform ios
eas build --profile production --platform android && eas submit --platform android
```

See `LAUNCH_CHECKLIST.md` for the full pre-launch list.

---

## 9. Build phases & status

| Phase | Scope | Status |
| --- | --- | --- |
| 1 – Foundation | Expo + theme + navigation + auth + role selection + Supabase schema/RLS/seed + shared UI + analytics | ✅ **complete** |
| 2 – Core property flow | Student onboarding/home, accommodation search/save/contact, landlord dashboard/listing creation/enquiries, DMs | ⏳ next |
| 3 – Student life | Roommate matching, community, events, marketplace, profiles | ⏳ |
| 4 – Release readiness | Realtime reliability, notifications, a11y, tests, empty/error/offline, analytics wiring, TestFlight/Android beta | ⏳ |

### Branding

- **Logo + colour are set** from `hommiebrand/hommielogo.png`: primary is indigo
  `#4F46E5`. App icon, splash, adaptive icon, notification icon and the in-app
  mark (`src/components/Brand/Logo.tsx`) all derive from it. Regenerate icons
  with the `mkicons.py` script if the source logo changes.
- **Still placeholder:** the type scale and spacing in `src/theme/*` (system font
  until brand fonts land) and screen-level layouts pending Figma. Screens consume
  semantic tokens only, so these remain contained changes.
- Screens marked `ComingSoon` are Phase 2–3.
```
