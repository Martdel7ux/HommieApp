import { useState } from 'react';
import { Switch, View } from 'react-native';
import { Stack } from 'expo-router';
import { Screen, Text, Button, Banner } from '@/components/ui';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { profileApi } from '@/features/profile/api';
import { toAppError } from '@/services/errors';
import {
  DEFAULT_NOTIFICATION_PREFS,
  NOTIFICATION_ROWS,
  readNotificationPrefs,
  type NotificationPrefs,
} from '@/features/profile/notifications';

function ToggleRow({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text variant="h3" style={{ fontSize: 15 }}>
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" muted>
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }}
        thumbColor={theme.colors.surface}
      />
    </View>
  );
}

export default function NotificationSettings() {
  const theme = useTheme();
  const { user, profile, refreshProfile } = useAuth();

  const [prefs, setPrefs] = useState<NotificationPrefs>(
    profile ? readNotificationPrefs(profile.notification_prefs) : DEFAULT_NOTIFICATION_PREFS,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k: keyof NotificationPrefs, v: boolean) => {
    setSaved(false);
    setPrefs((p) => ({ ...p, [k]: v }));
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await profileApi.updateProfile(user.id, {
        notification_prefs: prefs as unknown as Record<string, boolean>,
      });
      await refreshProfile();
      setSaved(true);
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Notifications',
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerTintColor: theme.colors.textPrimary,
        }}
      />
      <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.md }}>
        {error ? <Banner tone="danger" message={error} /> : null}

        <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, paddingHorizontal: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border }}>
          <ToggleRow
            label="Push notifications"
            hint="Turn all push alerts on or off"
            value={prefs.push}
            onChange={(v) => set('push', v)}
          />
        </View>

        <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, paddingHorizontal: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border }}>
          {NOTIFICATION_ROWS.map((row, i) => (
            <View key={row.key} style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.colors.border }}>
              <ToggleRow
                label={row.label}
                hint={row.hint}
                value={prefs[row.key]}
                onChange={(v) => set(row.key, v)}
                disabled={!prefs.push}
              />
            </View>
          ))}
        </View>

        <View style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, paddingHorizontal: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.border }}>
          <ToggleRow
            label="Weekly email digest"
            hint="A summary of new places and events by email"
            value={prefs.emailDigest}
            onChange={(v) => set('emailDigest', v)}
          />
        </View>

        <Button title={saved ? 'Saved' : 'Save'} loading={saving} disabled={saved} onPress={save} />
      </View>
    </Screen>
  );
}
