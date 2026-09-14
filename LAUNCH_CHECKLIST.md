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
- ☑ **Google sign-in — done**, confirmed working end-to-end on iOS + Android dev
      builds (migration 0015 applied).
- ☑ **Apple sign-in — done** 2026-09-12. App ID capability + Supabase provider
      configured; `EXPO_PUBLIC_APPLE_SIGN_IN_ENABLED=true`; tested on iOS
      Simulator via Xcode (native `Sign in with Apple` sheet, signed in
      successfully). Runbook: `docs/SOCIAL_AUTH_SETUP.md`.
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

- ☑ Expo push credentials — **Android (FCM) done** 2026-09-10 (Firebase project
      `hommie-ee589`, key uploaded to expo.dev); **iOS (APNs) done** 2026-09-12
      (APNs key `D4P3J246TG`, Apple Team `24C2YLCJ3R`, assigned via
      `eas credentials -p ios` to `com.hommie.app`)
- ☑ `push_tokens` registration + permission prompt wired (commit 084a877)
- ☑ Notification deep links land on the right screen (`routeForNotification` +
      `PushBootstrap`)
- ☑ `push-notify` edge function deployed + Database Webhook (`pg_net` trigger,
      migration 0020) live on the hosted project. Verified end-to-end via a
      direct DB insert → `200 {"sent":1}`. Runbook: `docs/PUSH_NOTIFICATIONS_SETUP.md`
- ☐ Real push delivery on a **physical Android device** not yet confirmed
      (emulators can't get a real push token — `Device.isDevice` is false there)
- ☐ Real push delivery on a **physical iOS device** not yet confirmed (same
      `Device.isDevice` limitation on the simulator; APNs key is in place)

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
- ◐ `eas build --profile production --platform ios --local` succeeds (2026-09-12,
      manual cert/profile — see [[hommie-testflight-distribution]]); Android
      production build not yet done
- ☑ `eas submit` iOS — **confirmed working end-to-end 2026-09-14**: build 2
      installed via TestFlight and opened successfully on a real iPhone
      (build 1 crashed on launch — missing EAS production env vars, fixed,
      see [[hommie-testflight-distribution]]). Play internal testing not yet done
- ◐ Beta feedback round started 2026-09-14: 1 blocking bug found + fixed
      (production build crashed on launch — missing EAS env vars)

## Launch day

- ☐ Production `.env` / EAS secrets double-checked
- ☐ DB backups / PITR enabled on Supabase
- ◐ Support inbox `support@hommieapp.com` created (Google Workspace); actual monitoring cadence TBD
- ☐ Rollback plan: previous build kept; OTA update channel ready
- ☐ Post-launch monitoring dashboard open (errors, sign-ups, crashes)
