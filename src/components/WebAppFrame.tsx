import { Platform, Pressable, View } from 'react-native';
import { Link } from 'expo-router';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import { Logo } from '@/components/Brand/Logo';
import { useAuth } from '@/features/auth/AuthProvider';
import { authApi } from '@/features/auth/api';

/**
 * Web-only: centers the app's existing phone-width screens in a column on
 * desktop browsers, instead of letting them stretch edge-to-edge. Every
 * screen stays pixel-identical — this wraps around the whole thing once in
 * app/_layout.tsx rather than touching individual screens (which mix
 * layout conventions: Screen, raw SafeAreaView, bare View). See the
 * web-app plan. No-op on native.
 */
export function WebAppFrame({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return <WebAppFrameWeb>{children}</WebAppFrameWeb>;
}

function WebAppFrameWeb({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  // Guest screens (browse, accommodation) already have their own header
  // with a "Sign in" link built in — only add this top nav once there's a
  // fully set-up account (not signed-out, and not mid-onboarding, same as
  // native has no tab bar until onboarding finishes either).
  const { status, role, needsOnboarding } = useAuth();
  const showNav = status === 'signed_in' && !needsOnboarding;

  return (
    <View style={{ flex: 1, alignItems: 'center', backgroundColor: theme.colors.surfaceSunken }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 480 }}>
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
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </View>
  );
}
