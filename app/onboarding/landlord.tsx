import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Screen, Text, Button, TextField, ChipGroup, Banner } from '@/components/ui';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { profileApi } from '@/features/profile/api';
import { analytics } from '@/services/analytics';
import { toAppError } from '@/services/errors';
import { CYPRUS_CITIES } from '@/config/constants';

export default function LandlordOnboarding() {
  const theme = useTheme();
  const { user, landlordProfile, refreshProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [contactName, setContactName] = useState(landlordProfile?.contact_name ?? '');
  const [businessName, setBusinessName] = useState(landlordProfile?.business_name ?? '');
  const [phone, setPhone] = useState(landlordProfile?.phone ?? '');
  const [areas, setAreas] = useState<string[]>(landlordProfile?.operating_areas ?? []);
  const [preferredContact, setPreferredContact] = useState<'in_app' | 'phone' | 'email'>(
    landlordProfile?.preferred_contact ?? 'in_app',
  );
  const [description, setDescription] = useState(landlordProfile?.description ?? '');

  const valid = contactName.trim().length > 0 && phone.trim().length >= 6 && areas.length > 0;

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await profileApi.updateLandlordProfile(user.id, {
        contact_name: contactName.trim(),
        business_name: businessName.trim() || null,
        phone: phone.trim(),
        operating_areas: areas,
        preferred_contact: preferredContact,
        description: description.trim() || null,
      });
      await profileApi.completeOnboarding(user.id);
      analytics.track('onboarding_completed', { role: 'landlord' });
      await refreshProfile();
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen keyboardAvoiding>
      <View style={{ flex: 1, gap: theme.spacing.lg }}>
        <View style={{ gap: 4, marginTop: theme.spacing.sm }}>
          <Text variant="h1">Set up your workspace</Text>
          <Text muted>A few details so students can trust and reach you.</Text>
        </View>

        {error ? <Banner tone="danger" message={error} /> : null}

        <ScrollView contentContainerStyle={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xl }} showsVerticalScrollIndicator={false}>
          <TextField label="Full name" value={contactName} onChangeText={setContactName} autoCapitalize="words" />
          <TextField label="Business name (optional)" value={businessName} onChangeText={setBusinessName} autoCapitalize="words" />
          <TextField label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="label" color={theme.colors.textSecondary}>
              Operating areas
            </Text>
            <ChipGroup
              multiple
              options={CYPRUS_CITIES.map((c) => ({ value: c, label: c }))}
              value={areas}
              onChange={(v) => setAreas(v as string[])}
            />
          </View>

          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="label" color={theme.colors.textSecondary}>
              Preferred contact method
            </Text>
            <ChipGroup
              options={[
                { value: 'in_app', label: 'In-app messages' },
                { value: 'phone', label: 'Phone' },
                { value: 'email', label: 'Email' },
              ]}
              value={preferredContact}
              onChange={(v) => setPreferredContact(v as 'in_app' | 'phone' | 'email')}
            />
          </View>

          <TextField
            label="Short description (optional)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={{ minHeight: 96, textAlignVertical: 'top' }}
          />

          <Banner
            tone="info"
            title="Verification"
            message="You can submit verification later from your profile. Listings can be created now; the “Hommie Verified” badge is only shown after manual approval."
          />
        </ScrollView>

        <Button title="Finish setup" loading={saving} disabled={!valid} onPress={finish} />
      </View>
    </Screen>
  );
}
