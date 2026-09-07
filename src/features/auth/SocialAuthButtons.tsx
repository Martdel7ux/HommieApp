import type { ReactNode } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { toAppError } from '@/services/errors';
import type { UserRole } from '@/types/database';
import { useAuth } from './AuthProvider';
import { authApi } from './api';
import {
  appleSignInSupported,
  googleSignInConfigured,
  socialAuthSupported,
  SocialCancelledError,
  type SocialProvider,
} from './social';

interface Props {
  /** Role picked on the welcome screen, applied to brand-new social accounts. */
  role?: UserRole;
  /** Called with a message on failure, and with '' to clear it when a run starts. */
  onError?: (message: string) => void;
  label?: string;
}

export function SocialAuthButtons({ role, onError, label = 'or continue with' }: Props) {
  const theme = useTheme();
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  // `refreshProfile` is stable (it reads the session from the client, not React
  // state), so it's safe to close over directly.
  const { refreshProfile } = useAuth();

  if (!socialAuthSupported) return null;

  const run = (provider: SocialProvider, fn: () => Promise<unknown>) => async () => {
    if (busy) return;
    setBusy(provider);
    onError?.('');
    try {
      await fn();
      // A brand-new "I'm a Landlord" social sign-up switched the profile role
      // server-side (apply_selected_role) after the SIGNED_IN event already
      // loaded it as 'student' — re-read it so AuthGate routes to the right
      // onboarding. Harmless for every other case.
      await refreshProfile();
      // AuthGate handles navigation from here.
    } catch (e) {
      if (!(e instanceof SocialCancelledError)) onError?.(toAppError(e).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
        <Text variant="caption" muted>
          {label}
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.colors.border }} />
      </View>

      {appleSignInSupported ? (
        <SocialButton
          icon={<FontAwesome name="apple" size={19} color="#FFFFFF" />}
          label="Sign in with Apple"
          background="#000000"
          foreground="#FFFFFF"
          border="#000000"
          loading={busy === 'apple'}
          disabled={busy !== null}
          onPress={run('apple', () => authApi.signInWithApple(role))}
        />
      ) : null}

      {googleSignInConfigured ? (
        <SocialButton
          icon={<FontAwesome name="google" size={17} color="#DB4437" />}
          label="Sign in with Google"
          background={theme.colors.surface}
          foreground={theme.colors.textPrimary}
          border={theme.colors.borderStrong}
          loading={busy === 'google'}
          disabled={busy !== null}
          onPress={run('google', () => authApi.signInWithGoogle(role))}
        />
      ) : null}
    </View>
  );
}

function SocialButton({
  icon,
  label,
  background,
  foreground,
  border,
  loading,
  disabled,
  onPress,
}: {
  icon: ReactNode;
  label: string;
  background: string;
  foreground: string;
  border: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 48,
        borderRadius: theme.radius.md,
        backgroundColor: background,
        borderWidth: 1,
        borderColor: border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.sm,
        opacity: disabled && !loading ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {icon}
          <Text variant="button" color={foreground}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
