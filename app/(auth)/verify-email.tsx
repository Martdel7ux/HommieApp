import { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, Button, Banner } from '@/components/ui';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { authApi } from '@/features/auth/api';
import { supabase } from '@/lib/supabase';
import { toAppError } from '@/services/errors';

export default function VerifyEmail() {
  const theme = useTheme();
  const { user, refreshProfile } = useAuth();
  const [message, setMessage] = useState<{ tone: 'info' | 'success' | 'danger'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const resend = async () => {
    if (!user?.email) return;
    setBusy(true);
    setMessage(null);
    try {
      await authApi.resendVerification(user.email);
      setMessage({ tone: 'success', text: 'Verification email sent. Check your inbox and spam folder.' });
    } catch (e) {
      setMessage({ tone: 'danger', text: toAppError(e).message });
    } finally {
      setBusy(false);
    }
  };

  const checkAgain = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      const verified = !!data.user?.email_confirmed_at;
      await refreshProfile();
      if (!verified) {
        setMessage({ tone: 'info', text: 'Not confirmed yet. Tap the link in the email, then check again.' });
      }
      // If verified, AuthGate moves the user on automatically.
    } catch (e) {
      setMessage({ tone: 'danger', text: toAppError(e).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, gap: theme.spacing.lg, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: theme.colors.primarySubtle,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="mail-unread-outline" size={32} color={theme.colors.primaryPressed} />
          </View>
          <Text variant="h1" align="center">
            Confirm your email
          </Text>
          <Text muted align="center">
            We sent a confirmation link to{'\n'}
            <Text weight="600">{user?.email}</Text>
          </Text>
        </View>

        {message ? <Banner tone={message.tone} message={message.text} /> : null}

        <View style={{ gap: theme.spacing.sm }}>
          <Button title="I've confirmed my email" loading={busy} onPress={checkAgain} />
          <Button title="Resend email" variant="ghost" loading={busy} onPress={resend} />
          <Button title="Sign out" variant="ghost" onPress={() => authApi.signOut()} />
        </View>
      </View>
    </Screen>
  );
}
