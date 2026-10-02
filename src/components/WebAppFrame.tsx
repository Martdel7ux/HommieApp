import { Platform, Pressable, useWindowDimensions, View } from 'react-native';
import { Link, usePathname } from 'expo-router';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import { Logo } from '@/components/Brand/Logo';
import { useAuth } from '@/features/auth/AuthProvider';
import { authApi } from '@/features/auth/api';

export const WEB_WIDE_BREAKPOINT = 900;

/** Grid/carousel screens should fill the browser, not sit in a narrow boxed column. */
function isFullBleedRoute(pathname: string): boolean {
  return pathname === '/browse' || pathname === '/accommodation';
}

/** How much horizontal room a given route should get on a wide (desktop) browser. */
function maxWidthFor(pathname: string, isWide: boolean): number {
  if (!isWide) return 480; // narrow browser/phone web: unchanged, looks like the native app
  if (isFullBleedRoute(pathname)) return 1800; // effectively the whole browser on any normal monitor
  if (pathname.startsWith('/accommodation/')) return 760; // listing detail: more room for images/description
  if (pathname.startsWith('/messages')) return 1100; // two-pane conversation list + open thread
  return 720; // forms, onboarding, landlord-web: still one focused centered column (the normal
  // pattern for these even on desktop — Stripe, Linear, Notion all do this for
  // sign-up/login), just noticeably bigger than the old 560 so it doesn't read as a
  // phone-width box dropped onto a big screen
}

/**
 * Web-only: centers the app's existing phone-width screens in a column on
 * desktop browsers, instead of letting them stretch edge-to-edge or look
 * like a phone mockup floating in gray space. The column's width adapts to
 * both the route (list/grid screens get real desktop width; forms and chat
 * stay a focused reading column, which is normal for those even on wide
 * desktop web apps) and the viewport (phones/narrow browsers keep the
 * original mobile-width treatment). This wraps around the whole thing once
 * in app/_layout.tsx rather than touching individual screens (which mix
 * layout conventions: Screen, raw SafeAreaView, bare View). See the
 * web-app plan. No-op on native.
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
  const maxWidth = maxWidthFor(pathname, isWide);
  // Full-bleed routes no longer have a boxed column keeping them off the
  // viewport edges, so give them page-level side margins directly here
  // instead (the list/grid screens' own internal padding was only ever
  // tuned for mobile's ~16-20px, which looks cramped flush against a wide
  // browser window).
  const edgePadding = isWide && isFullBleedRoute(pathname) ? theme.spacing['2xl'] : 0;
  // Guest screens (browse, accommodation) already have their own header
  // with a "Sign in" link built in — only add this top nav once there's a
  // fully set-up account (not signed-out, and not mid-onboarding, same as
  // native has no tab bar until onboarding finishes either).
  const { status, role, needsOnboarding } = useAuth();
  const showNav = status === 'signed_in' && !needsOnboarding;

  return (
    <View style={{ flex: 1, alignItems: 'center', backgroundColor: theme.colors.surfaceSunken }}>
      <View style={{ flex: 1, width: '100%', maxWidth }}>
        {showNav ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: theme.layout.screenPadding,
              paddingVertical: theme.spacing.md,
              backgroundColor: theme.colors.background,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <Logo size={24} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
              {role !== 'landlord' ? (
                <Link href="/accommodation" asChild>
                  <Pressable>
                    <Text variant="label" color={theme.colors.textSecondary}>
                      Browse
                    </Text>
                  </Pressable>
                </Link>
              ) : null}
              <Link href="/messages" asChild>
                <Pressable>
                  <Text variant="label" color={theme.colors.textSecondary}>
                    Messages
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
        ) : null}
        <View style={{ flex: 1, paddingHorizontal: edgePadding }}>{children}</View>
      </View>
    </View>
  );
}
