# Hommie — Launch Checklist (target: 11 October 2026)

Status legend: ☐ not started · ◐ in progress · ☑ done

## Product completeness (do not call the product "done" until all ☑)

- ☐ Student journey tested end-to-end on **iOS device** and **Android device**
      (sign-up → verify → onboarding → browse accommodation → save → contact → chat)
- ☐ Landlord journey tested end-to-end on **iOS device** and **Android device**
      (sign-up → onboarding → create listing → publish → receive enquiry → reply)
- ☐ Messaging verified between a real student and landlord account (realtime + retry)
- ☐ Roommate matching: create profile, browse, compatibility score renders, contact
- ☐ Marketplace + events + community basic flows verified
- ☐ Every screen has loading / empty / error states
- ☐ Offline behaviour acceptable (cached data shows, actions queue or fail gracefully)

## Brand & content

- ☐ `hommiebrand/` guidelines applied to `src/theme/*` (colour, type, spacing)
- ☐ Logo, splash, app icon, adaptive icon, notification icon replaced
- ☐ Figma components matched (spacing, hierarchy, component states)
- ☐ Copy/tone reviewed; no placeholder Lorem text
- ☐ Seed data reviewed / replaced with real early listings & events for launch

## Accounts, auth & security

- ☐ Production Supabase project created; migrations pushed (`supabase db push`)
- ☐ RLS enabled on **every** table; policies reviewed against `docs`/security rules
- ☐ Storage buckets created with size limits + owner-path policies
- ☐ Email templates (confirm, reset) branded in Supabase dashboard
- ☐ Auth redirect URLs include `hommie://` and the production universal link
- ☐ Rate limits / captcha configured for auth endpoints
- ☐ Service-role key stored only in server/CI secrets; `grep -r EXPO_PUBLIC .env` sane
- ☐ `npx expo-doctor` clean; `npm run typecheck` + `npm run lint` clean
- ☐ Delete-account request flow verified (profile deactivates; staff job documented)
- ☐ Landlord "Hommie Verified" only set after genuine manual approval

## Notifications

- ☐ Expo push credentials configured (APNs key, FCM key) via `eas credentials`
- ☐ `push_tokens` registration + permission prompt wired
- ☐ In-app notifications for messages & enquiries verified
- ☐ Notification deep links land on the right screen

## Analytics & monitoring

- ☐ Analytics provider chosen and registered in `app/_layout.tsx`
- ☐ `EXPO_PUBLIC_ANALYTICS_ENABLED=true` in production profile
- ☐ Crash reporting wired into `logger.capture` (Sentry/Bugsnag DSN in secrets)
- ☐ Key funnels validated (sign-up, enquiry_sent, message_sent)

## Store readiness

- ☐ `app.config.ts`: bundle ids, version, build numbers finalised
- ☐ iOS: App Store Connect app, privacy nutrition labels, screenshots, description
- ☐ Android: Play Console app, data safety form, screenshots, description
- ☐ Privacy Policy + Terms of Service URLs live and linked in-app
- ☐ Age rating / content rating questionnaires completed
- ☐ `eas build --profile production --platform all` succeeds
- ☐ `eas submit` to TestFlight + Play internal testing
- ☐ Beta feedback round completed; blocking bugs fixed

## Launch day

- ☐ Production `.env` / EAS secrets double-checked
- ☐ DB backups / PITR enabled on Supabase
- ☐ Support inbox (`support@hommie.app`) monitored
- ☐ Rollback plan: previous build kept; OTA update channel ready
- ☐ Post-launch monitoring dashboard open (errors, sign-ups, crashes)
