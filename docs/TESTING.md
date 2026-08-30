# Testing Hommie

## Automated (run before every PR)

```bash
npm run typecheck      # tsc --noEmit — must pass
npm run lint           # eslint — must pass (0 errors)
npx expo export --platform ios       # must bundle
npx expo export --platform android   # must bundle
npx expo-doctor        # should be clean
```

Unit/integration tests (Jest + React Native Testing Library) are added in Phase 4.

## Manual — Phase 1 acceptance

Prereqs: `supabase start` + `supabase db reset`, `.env` pointed at local, app
running on **both** an iOS simulator and an Android emulator.

### Auth & role selection
1. Launch app cold → lands on **Welcome** with two role cards.
2. Pick **I'm a Student** → Continue → **Sign up** form (student fields only).
3. Pick **I'm a Landlord** from Welcome → sign-up form shows phone + business name,
   and phone is required.
4. Submit sign-up with mismatched passwords → inline error, no request sent.
5. Submit valid sign-up → **Verify email** screen. Open Inbucket, confirm, tap
   "I've confirmed — continue" → proceeds to onboarding.
6. "Resend email" shows a success banner.
7. Sign in with a seeded account (`maria.student@hommie.test` / `Passw0rd!`) →
   lands directly in the student tabs (already onboarded).
8. Sign in with wrong password → friendly error, no crash.
9. Forgot password → enter email → success banner (no user enumeration).
10. Kill and relaunch the app while signed in → session persists, no re-login.

### Onboarding
11. New student account → 4-step wizard; progress bar advances; "Continue"
    disabled until required fields set; bad date format shows an error.
12. Finish → lands on **Student Home** with greeting + quick actions +
    "Complete your profile" prompt reflecting real completeness %.
13. New landlord account → single setup screen; "Finish setup" disabled until
    name + phone + at least one operating area; verification banner explains the
    badge is manual-only.

### Navigation & role separation
14. Student tabs: Home, Explore, Messages, Community, Profile. Landlord tabs:
    Dashboard, My Listings, Enquiries, Messages, Profile.
15. Landlord Dashboard shows the stat grid from `landlord_dashboard_summary`
    (seeded landlord `costas.landlord@hommie.test` shows non-zero views/enquiries).
16. Profile → Sign out → returns to Welcome; query cache cleared.
17. Profile → Delete account → confirm → account deactivated + signed out;
    signing back in fails (profile `is_active = false`).

### Data / RLS spot checks (Studio SQL editor or `psql`)
18. As student JWT, `select * from accommodation_listings` → only `active` rows.
19. As student, `insert into accommodation_listings (...)` → denied by RLS.
20. As landlord A, `update` landlord B's listing → 0 rows / denied.
21. `select * from messages` for a conversation you're not in → 0 rows.
22. Student updating their own `profiles.role` to `landlord` → rejected.

### Resilience
23. Turn off network → pull-to-refresh a data screen → error state with retry,
    no crash; cached content still visible.
24. Trigger a render error (temporarily throw in a screen) → ErrorBoundary
    fallback shows, "Try to recover" works.
