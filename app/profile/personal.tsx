import { useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Screen, Text, Button, TextField, Banner } from '@/components/ui';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { profileApi } from '@/features/profile/api';
import { toAppError } from '@/services/errors';

export default function PersonalInformation() {
  const theme = useTheme();
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();

  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty =
    firstName !== (profile?.first_name ?? '') ||
    lastName !== (profile?.last_name ?? '') ||
    phone !== (profile?.phone ?? '') ||
    bio !== (profile?.bio ?? '');

  const save = async () => {
    if (!user || !firstName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const first = firstName.trim();
      const last = lastName.trim();
      await profileApi.updateProfile(user.id, {
        first_name: first,
        last_name: last || null,
        display_name: [first, last].filter(Boolean).join(' ') || first,
        phone: phone.trim() || null,
        bio: bio.trim() || null,
      });
      await refreshProfile();
      router.back();
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll keyboardAvoiding>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Personal Information',
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerTintColor: theme.colors.textPrimary,
        }}
      />
      <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.md }}>
        {error ? <Banner tone="danger" message={error} /> : null}

        <TextField label="First name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
        <TextField label="Last name" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        <TextField
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+357 …"
        />
        <TextField
          label="Bio"
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={300}
          placeholder="A line or two about you"
          hint={`${bio.length}/300`}
          style={{ minHeight: 90, textAlignVertical: 'top' }}
        />

        <View style={{ gap: theme.spacing.sm }}>
          <TextField label="Email" value={user?.email ?? ''} editable={false} />
          <Text variant="caption" muted>
            Your email is used to sign in. Contact support to change it.
          </Text>
        </View>

        <Button title="Save" loading={saving} disabled={!dirty || !firstName.trim()} onPress={save} />
      </View>
    </Screen>
  );
}
