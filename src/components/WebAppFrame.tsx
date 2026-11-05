import { Platform, Pressable, useWindowDimensions, View } from 'react-native';
import { Link, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import { Logo } from '@/components/Brand/Logo';
import { useAuth } from '@/features/auth/AuthProvider';
import { authApi } from '@/features/auth/api';
import { useUnreadNotificationCount } from '@/features/notifications/hooks';

export const WEB_WIDE_BREAKPOINT = 900;

// Jobs is deliberately left out here — it's hidden on native too until a
// job-listing partner is lined up (see (student)/_layout.tsx's explore tab).
const NAV_LINKS = [
  { href: '/accommodation', label: 'Browse' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/roommates', label: 'Roommates' },
  { href: '/events', label: 'Events' },
  { href: '/community', label: 'Community' },
] as const;

const FULL_BLEED_PATHS = new Set(['/browse', '/accommodation', '/marketplace', '/roommates', '/events', '/community']);
const WIDE_PREFIXES = ['/messages', '/accommodation/', '/marketplace/', '/roommates/', '/events/', '/community/', '/landlord/'];

type LayoutMode = 'full-bleed' | 'wide' | 'branded' | 'interior';

/**
 * - full-bleed: grid/list browsing screens — use the whole browser width
 * - wide: detail/reading pages (listing, item, profile, post) + messages'
 *   two-pane thread view — wider than a form, still a readable column
 * - branded: pre-auth/onboarding (no top nav yet) — a focused form column
 *   plus a decorative brand panel filling the rest of the screen, instead
 *   of a lone box in empty space
 * - interior: everything else once signed in and onboarded (profile,
 *   settings, landlord-web) — a wider centered column, no panel (a
 *   decorative panel next to a settings form would look out of place)
 */
function layoutModeFor(pathname: string, showNav: boolean): LayoutMode {
  if (FULL_BLEED_PATHS.has(pathname)) return 'full-bleed';
  if (WIDE_PREFIXES.some((p) => pathname.startsWith(p))) return 'wide';
  if (!showNav) return 'branded';
  return 'interior';
}

function contentWidthFor(mode: LayoutMode, pathname: string, isWide: boolean): number {
  if (!isWide) return 480; // narrow browser/phone web: unchanged, looks like the native app
  switch (mode) {
    case 'full-bleed':
      return 1800; // effectively the whole browser on any normal monitor
    case 'wide':
      return pathname.startsWith('/messages') ? 1300 : 900;
    case 'branded':
      return 440; // a standard login/onboarding card width — the brand panel fills the rest
    case 'interior':
      return 960;
  }
}

function BrandPanel() {
  const theme = useTheme();
  return (
    <LinearGradient
      colors={[theme.colors.primary, theme.colors.primaryBold]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing['3xl'] }}
    >
      <Logo size={64} inverse />
      <Text
        variant="h1"
        color={theme.colors.textInverse}
        align="center"
        style={{ marginTop: theme.spacing.xl, maxWidth: 360 }}
      >
        Student housing, roommates and campus life — all in one place
      </Text>
      <Text
        color={theme.colors.textInverse}
        align="center"
        style={{ marginTop: theme.spacing.md, maxWidth: 340, opacity: 0.85 }}
      >
        Hommie helps students across Cyprus find a home, a flatmate and a community.
      </Text>
    </LinearGradient>
  );
}

/**
 * Web-only: lays the app's existing phone-width screens out properly for a
 * desktop browser instead of letting them sit as a narrow box in empty
 * gray space. The top nav spans the full viewport width; the body below it
 * uses one of four width/layout treatments depending on the route (see
 * layoutModeFor). This wraps around the whole thing once in app/_layout.tsx
 * rather than touching individual screens. No-op on native.
 */
export function WebAppFrame({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return <WebAppFrameWeb>{children}</WebAppFrameWeb>;
}

function WebAppFrameWeb({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const isWide = width >= WEB_WIDE_BREAKPOINT;
  // Guest screens (browse, accommodation) already have their own header
  // with a "Sign in" link built in — only add this top nav once there's a
  // fully set-up account (not signed-out, and not mid-onboarding, same as
  // native has no tab bar until onboarding finishes either).
  const { status, role, needsOnboarding } = useAuth();
  const showNav = status === 'signed_in' && !needsOnboarding;
  const unread = useUnreadNotificationCount();

  const mode = layoutModeFor(pathname, showNav);
  const contentWidth = contentWidthFor(mode, pathname, isWide);
  const showPanel = mode === 'branded' && isWide;
  // Full-bleed routes no longer have a boxed column keeping them off the
  // viewport edges, so give them page-level side margins directly here
  // instead (the list/grid screens' own internal padding was only ever
  // tuned for mobile's ~16-20px, which looks cramped flush against a wide
  // browser window).
  const edgePadding = isWide && mode === 'full-bleed' ? theme.spacing['2xl'] : 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceSunken }}>
      {showNav ? (
        <View
          style={{
            backgroundColor: theme.colors.background,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            alignItems: 'center',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              maxWidth: 1800,
              paddingHorizontal: theme.layout.screenPadding,
              paddingVertical: theme.spacing.md,
            }}
          >
            <Logo size={24} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
              {role !== 'landlord'
                ? NAV_LINKS.map((link) => (
                    <Link key={link.href} href={link.href} asChild>
                      <Pressable>
                        <Text variant="label" color={theme.colors.textSecondary}>
                          {link.label}
                        </Text>
                      </Pressable>
                    </Link>
                  ))
                : null}
              <Link href="/messages" asChild>
                <Pressable>
                  <Text variant="label" color={theme.colors.textSecondary}>
                    Messages
                  </Text>
                </Pressable>
              </Link>
              <Link href="/notifications" asChild>
                <Pressable accessibilityLabel="Notifications" style={{ paddingVertical: 2 }}>
                  <View>
                    <Ionicons name="notifications-outline" size={20} color={theme.colors.textSecondary} />
                    {(unread.data ?? 0) > 0 ? (
                      <View
                        style={{
                          position: 'absolute',
                          top: -2,
                          right: -2,
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: theme.colors.danger,
                          borderWidth: 1.5,
                          borderColor: theme.colors.background,
                        }}
                      />
                    ) : null}
                  </View>
                </Pressable>
              </Link>
              <Link href="/profile" asChild>
                <Pressable>
                  <Text variant="label" color={theme.colors.textSecondary}>
                    Profile
                  </Text>
                </Pressable>
              </Link>
              <Pressable onPress={() => authApi.signOut()}>
                <Text variant="label" color={theme.colors.textSecondary}>
                  Sign out
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {showPanel ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl }}>
            <View style={{ width: '100%', maxWidth: contentWidth }}>{children}</View>
          </View>
          <View style={{ flex: 1, maxWidth: 640 }}>
            <BrandPanel />
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ flex: 1, width: '100%', maxWidth: contentWidth, paddingHorizontal: edgePadding }}>
            {children}
          </View>
        </View>
      )}
    </View>
  );
}
