import type { ComponentProps, ReactNode } from 'react';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen, Text, Button, Avatar } from '@/components/ui';
import { useTheme, useThemeMode } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { authApi } from '@/features/auth/api';
import { profileApi } from '@/features/profile/api';
import { qk } from '@/lib/queryClient';
import { STORAGE_BUCKETS } from '@/lib/supabase';
import { resolveAvatar } from '@/lib/images';
import { uploadImage } from '@/lib/upload';
import { toAppError } from '@/services/errors';
import { haptics } from '@/services/haptics';
import { APP_NAME } from '@/config/constants';
import { verificationLabels } from '@/config/labels';

type RowIcon = { render: (color: string, size: number) => ReactNode };

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        borderRadius: theme.radius.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
      }}
    >
      <View style={{ backgroundColor: theme.colors.surfaceAlt, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md }}>
        <Text variant="h3" color={theme.colors.primary} style={{ fontSize: 16 }}>
          {title}
        </Text>
      </View>
      <View style={{ backgroundColor: theme.colors.surface }}>{children}</View>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  subtitle,
  onPress,
  verified,
  first,
}: {
  icon: RowIcon;
  label: string;
  subtitle: string;
  onPress: () => void;
  verified?: boolean;
  first?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${subtitle}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: theme.colors.border,
        backgroundColor: pressed ? theme.colors.surfaceAlt : theme.colors.surface,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: theme.colors.primarySubtle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon.render(theme.colors.primary, 20)}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="h3" style={{ fontSize: 15 }}>
          {label}
        </Text>
        <Text variant="caption" muted>
          {subtitle}
        </Text>
      </View>
      {verified ? (
        <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
    </Pressable>
  );
}

const ion = (name: keyof typeof Ionicons.glyphMap): RowIcon => ({
  render: (color, size) => <Ionicons name={name} size={size} color={color} />,
});
const mci = (name: ComponentProps<typeof MaterialCommunityIcons>['name']): RowIcon => ({
  render: (color, size) => <MaterialCommunityIcons name={name} size={size} color={color} />,
});

const APPEARANCE_LABELS = { light: 'Light', dark: 'Dark', system: 'Matches device' } as const;

export function ProfileScreen() {
  const theme = useTheme();
  const { preference } = useThemeMode();
  const router = useRouter();
  const { profile, landlordProfile, role, user, refreshProfile } = useAuth();
  const isStudent = role !== 'landlord';
  const isVerified = isStudent
    ? profile?.verification === 'verified'
    : landlordProfile?.verification === 'verified';

  const [pendingPhoto, setPendingPhoto] = useState<{ uri: string; mimeType?: string | null } | null>(null);
  const [saving, setSaving] = useState(false);

  const universities = useQuery({
    queryKey: qk.universities,
    queryFn: () => profileApi.getUniversities(),
    staleTime: 24 * 60 * 60 * 1000,
    enabled: isStudent && !!profile?.university_id,
  });

  const name =
    landlordProfile?.business_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    profile?.display_name ||
    'Your profile';

  const universityName =
    universities.data?.find((u) => u.id === profile?.university_id)?.name ?? null;
  const subtitle = isStudent
    ? universityName ?? user?.email ?? ''
    : landlordProfile
      ? verificationLabels[landlordProfile.verification]
      : user?.email ?? '';

  const avatarUri = pendingPhoto?.uri ?? resolveAvatar(profile?.avatar_url ?? landlordProfile?.logo_url);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos permission needed', 'Enable photo access in Settings to change your picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    setPendingPhoto({ uri: result.assets[0].uri, mimeType: result.assets[0].mimeType });
  };

  const save = async () => {
    if (!pendingPhoto || !user) return;
    setSaving(true);
    try {
      const path = await uploadImage(STORAGE_BUCKETS.avatars, `${user.id}`, pendingPhoto.uri, {
        contentType: pendingPhoto.mimeType ?? 'image/jpeg',
      });
      await profileApi.updateProfile(user.id, { avatar_url: path });
      await refreshProfile();
      setPendingPhoto(null);
      Alert.alert('Saved', 'Your profile picture has been updated.');
    } catch (e) {
      Alert.alert('Could not save', toAppError(e).message);
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => {
          haptics.warning();
          authApi.signOut();
        },
      },
    ]);
  };

  const requestDelete = () => {
    Alert.alert(
      'Delete account',
      `This requests deletion of your ${APP_NAME} account. Your profile is deactivated immediately and permanently removed by our team. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request deletion',
          style: 'destructive',
          onPress: async () => {
            haptics.warning();
            try {
              await authApi.requestAccountDeletion();
            } catch (e) {
              Alert.alert('Could not complete', toAppError(e).message);
            }
          },
        },
      ],
    );
  };

  const soon = (what: string) => () => Alert.alert('Coming soon', what);

  return (
    <Screen scroll backgroundColor={theme.colors.surfaceAlt} contentContainerStyle={{ paddingBottom: theme.spacing['4xl'] }}>
      <View style={{ gap: theme.spacing.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <Pressable onPress={() => router.push('/notifications')} hitSlop={10} accessibilityLabel="Notifications">
              <Ionicons name="notifications-outline" size={24} color={theme.colors.textPrimary} />
            </Pressable>
            <Avatar uri={avatarUri} name={name} size={34} />
          </View>
        </View>

        {/* Identity */}
        <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
          <Pressable onPress={pickPhoto} accessibilityLabel="Change profile picture">
            <Avatar uri={avatarUri} name={name} size={92} />
            <View
              style={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: theme.colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 3,
                borderColor: theme.colors.surfaceAlt,
              }}
            >
              <Ionicons name="pencil" size={13} color={theme.colors.onPrimary} />
            </View>
          </Pressable>
          <Text variant="h1" align="center">
            {name}
          </Text>
          {subtitle ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text variant="body" muted>
                {subtitle}
              </Text>
              {isVerified && (
                <MaterialCommunityIcons name="check-decagram" size={16} color={theme.colors.success} />
              )}
            </View>
          ) : null}
        </View>

        <SettingsSection title="Account Settings">
          <SettingsRow
            first
            icon={ion('person-outline')}
            label="Personal Information"
            subtitle="Update your name, phone, and bio"
            onPress={() => router.push('/profile/personal')}
          />
          <SettingsRow
            icon={mci('school-outline')}
            label={isStudent ? 'University Verification' : 'Business Verification'}
            subtitle={isStudent ? 'Manage your student status' : 'Manage your landlord verification'}
            verified={isVerified}
            onPress={() =>
              isStudent ? router.push('/profile/verification') : soon('Landlord verification arrives with the next update.')()
            }
          />
        </SettingsSection>

        {isStudent ? (
          <SettingsSection title="Preferences">
            <SettingsRow
              first
              icon={mci('home-city-outline')}
              label="Housing Filters"
              subtitle="Budget, area and move-in"
              onPress={() => router.push('/profile/housing')}
            />
            <SettingsRow
              icon={ion('people-outline')}
              label="Roommate Matching"
              subtitle="Lifestyle habits and preferences"
              onPress={() => router.push('/roommates/new')}
            />
          </SettingsSection>
        ) : null}

        <SettingsSection title="General">
          <SettingsRow
            first
            icon={ion('notifications-outline')}
            label="Notifications"
            subtitle="Push and email alerts"
            onPress={() => router.push('/profile/notifications')}
          />
          <SettingsRow
            icon={ion('contrast-outline')}
            label="Appearance"
            subtitle={APPEARANCE_LABELS[preference]}
            onPress={() => router.push('/profile/appearance')}
          />
          <SettingsRow
            icon={ion('help-circle-outline')}
            label="Support & Help"
            subtitle="FAQs and contact us"
            onPress={() => router.push('/profile/support')}
          />
        </SettingsSection>

        <Button
          title="Save Changes"
          loading={saving}
          disabled={!pendingPhoto}
          onPress={save}
        />

        <Pressable
          onPress={logout}
          accessibilityRole="button"
          accessibilityLabel="Log out"
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: theme.spacing.sm }}
        >
          <Ionicons name="log-out-outline" size={18} color={theme.colors.danger} />
          <Text variant="label" color={theme.colors.danger}>
            Logout
          </Text>
        </Pressable>

        <Pressable onPress={requestDelete} style={{ alignSelf: 'center', padding: theme.spacing.xs }}>
          <Text variant="caption" muted>
            Delete account
          </Text>
        </Pressable>

        <Text variant="caption" muted align="center">
          {APP_NAME} · v1.0.0
        </Text>
      </View>
    </Screen>
  );
}
