import { useState } from 'react';
import { Alert, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, Card, Avatar, Badge, Button } from '@/components/ui';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { authApi } from '@/features/auth/api';
import { verificationLabels } from '@/config/labels';
import { APP_NAME, SUPPORT_EMAIL } from '@/config/constants';

function Row({
  icon,
  label,
  value,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const theme = useTheme();
  const color = danger ? theme.colors.danger : theme.colors.textPrimary;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md,
      }}
    >
      <Ionicons name={icon} size={20} color={danger ? theme.colors.danger : theme.colors.textSecondary} />
      <Text style={{ flex: 1 }} color={color}>
        {label}
      </Text>
      {value ? (
        <Text variant="bodySm" muted>
          {value}
        </Text>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} /> : null}
    </Pressable>
  );
}

export function ProfileScreen() {
  const theme = useTheme();
  const { profile, landlordProfile, role, user } = useAuth();
  const [busy, setBusy] = useState(false);

  const displayName =
    landlordProfile?.business_name || profile?.display_name || profile?.first_name || 'Your profile';

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => authApi.signOut() },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete account',
      `This requests deletion of your ${APP_NAME} account. Your profile is deactivated immediately and permanently removed by our team. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request deletion',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await authApi.requestAccountDeletion();
            } catch (e) {
              Alert.alert('Could not complete', (e as Error).message);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing.xl }}>
        <View style={{ alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
          <Avatar uri={profile?.avatar_url ?? landlordProfile?.logo_url} name={displayName} size={84} />
          <Text variant="h2">{displayName}</Text>
          <Text variant="bodySm" muted>
            {user?.email}
          </Text>
          {role === 'landlord' && landlordProfile ? (
            <Badge
              label={verificationLabels[landlordProfile.verification]}
              tone={landlordProfile.verification === 'verified' ? 'success' : landlordProfile.verification === 'submitted' ? 'info' : 'neutral'}
              icon={landlordProfile.verification === 'verified' ? 'shield-checkmark' : 'shield-outline'}
            />
          ) : (
            <Badge label="Student" tone="brand" icon="school" />
          )}
        </View>

        <Card padded={false} style={{ paddingHorizontal: theme.spacing.lg }}>
          <Row icon="person-outline" label="Edit personal details" onPress={() => Alert.alert('Coming soon', 'Profile editing arrives with the next update.')} />
          <Row icon="options-outline" label={role === 'landlord' ? 'Contact preferences' : 'Preferences & interests'} onPress={() => Alert.alert('Coming soon')} />
          {role === 'student' ? (
            <Row icon="bookmark-outline" label="Saved items" onPress={() => Alert.alert('Coming soon', 'Saved accommodation, roommates and marketplace items.')} />
          ) : (
            <Row icon="shield-checkmark-outline" label="Verification" value={landlordProfile ? verificationLabels[landlordProfile.verification] : undefined} onPress={() => Alert.alert('Coming soon')} />
          )}
        </Card>

        <Card padded={false} style={{ paddingHorizontal: theme.spacing.lg }}>
          <Row icon="notifications-outline" label="Notifications" onPress={() => Alert.alert('Coming soon')} />
          <Row icon="lock-closed-outline" label="Privacy" onPress={() => Alert.alert('Coming soon')} />
          <Row icon="help-circle-outline" label="Help & support" value={SUPPORT_EMAIL} onPress={() => Alert.alert('Support', `Email us at ${SUPPORT_EMAIL}`)} />
        </Card>

        {role === 'student' ? (
          <Card>
            <View style={{ gap: theme.spacing.sm }}>
              <Text variant="h3">Are you a landlord?</Text>
              <Text variant="bodySm" muted>
                Students can apply to add a landlord workspace. Your student account stays as it is.
              </Text>
              <Button
                title="Apply to become a landlord"
                variant="secondary"
                onPress={() => Alert.alert('Coming soon', 'The landlord application flow arrives with the next update.')}
              />
            </View>
          </Card>
        ) : null}

        <Card padded={false} style={{ paddingHorizontal: theme.spacing.lg }}>
          <Row icon="log-out-outline" label="Sign out" onPress={confirmSignOut} />
          <Row icon="trash-outline" label="Delete account" danger onPress={confirmDelete} />
        </Card>

        {busy ? (
          <Text variant="caption" muted align="center">
            Working…
          </Text>
        ) : null}
        <Text variant="caption" muted align="center">
          {APP_NAME} · v1.0.0
        </Text>
      </View>
    </Screen>
  );
}
