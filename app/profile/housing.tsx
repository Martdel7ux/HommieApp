import { useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Screen, Text, Button, TextField, DateField, Select, Banner } from '@/components/ui';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { profileApi } from '@/features/profile/api';
import { toAppError } from '@/services/errors';
import { CYPRUS_AREAS } from '@/config/constants';

export default function HousingFilters() {
  const theme = useTheme();
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();

  const [area, setArea] = useState<string | null>(profile?.campus_area ?? null);
  const [budgetMin, setBudgetMin] = useState(profile?.budget_min ? String(profile.budget_min) : '');
  const [budgetMax, setBudgetMax] = useState(profile?.budget_max ? String(profile.budget_max) : '');
  const [moveIn, setMoveIn] = useState(profile?.move_in_from ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await profileApi.updateProfile(user.id, {
        campus_area: area,
        budget_min: budgetMin ? Number(budgetMin) : null,
        budget_max: budgetMax ? Number(budgetMax) : null,
        move_in_from: moveIn || null,
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
          title: 'Housing Filters',
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerTintColor: theme.colors.textPrimary,
        }}
      />
      <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.md }}>
        {error ? <Banner tone="danger" message={error} /> : null}
        <Text variant="bodySm" muted>
          These become your starting filters when you open Explore.
        </Text>

        <Select
          label="Preferred area"
          placeholder="Any area"
          options={[{ value: '', label: 'Any area' }, ...CYPRUS_AREAS.map((a) => ({ value: a, label: a }))]}
          value={area ?? ''}
          onChange={(v) => setArea(v || null)}
        />

        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <TextField
            containerStyle={{ flex: 1 }}
            label="Budget min (€)"
            keyboardType="number-pad"
            value={budgetMin}
            onChangeText={(v) => setBudgetMin(v.replace(/[^0-9]/g, ''))}
          />
          <TextField
            containerStyle={{ flex: 1 }}
            label="Budget max (€)"
            keyboardType="number-pad"
            value={budgetMax}
            onChangeText={(v) => setBudgetMax(v.replace(/[^0-9]/g, ''))}
          />
        </View>

        <DateField
          label="Move-in from (optional)"
          placeholder="Select date"
          value={moveIn}
          onChange={setMoveIn}
          minimumDate={new Date()}
        />

        <Button title="Save" loading={saving} onPress={save} />
      </View>
    </Screen>
  );
}
