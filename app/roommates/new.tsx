import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { parseISO } from 'date-fns';
import { Screen, Text, Button, TextField, DateField, ChipGroup, Banner, LoadingState, ErrorState } from '@/components/ui';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { qk } from '@/lib/queryClient';
import { resolveImage } from '@/lib/images';
import { STORAGE_BUCKETS } from '@/lib/supabase';
import { notify } from '@/services/alert';
import { toAppError } from '@/services/errors';
import { analytics } from '@/services/analytics';
import { CYPRUS_AREAS, IMAGE_UPLOAD } from '@/config/constants';
import { roommatesApi, type RoommatePrefPatch } from '@/features/roommates/api';
import type { DraftFlatPhoto } from '@/features/roommates/types';
import {
  SLEEP_OPTS,
  SOCIAL_OPTS,
  TIDY_OPTS,
  SMOKING_OPTS,
  PETS_OPTS,
  GUESTS_OPTS,
  GENDER_PREF_OPTS,
  STUDENT_AUDIENCE_OPTS,
  HOUSING_STATUS_OPTS,
  LIFESTYLE_TAGS,
  tagLabel,
} from '@/features/roommates/options';

const MAX_FLAT_PHOTOS = IMAGE_UPLOAD.maxRoommateFlatImages;

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="label" color={theme.colors.textSecondary}>
        {label}
      </Text>
      {children}
      {hint ? (
        <Text variant="caption" muted>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const dateOk = (s: string) => s === '' || /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Adapt ChipGroup's (string | string[]) onChange for a single-select field. */
const one = (fn: (v: string | null) => void) => (v: string | string[]) => {
  if (!Array.isArray(v)) fn(v || null);
};
const opts = (o: readonly { readonly value: string; readonly label: string }[]) =>
  o.map((x) => ({ value: x.value as string, label: x.label }));

export default function EditRoommateProfile() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  const mine = useQuery({
    queryKey: [...qk.roommates('mine'), user?.id, 'full'],
    queryFn: () => roommatesApi.getMine(user!.id),
    enabled: !!user,
  });

  const [ready, setReady] = useState(false);
  const [headline, setHeadline] = useState('');
  const [about, setAbout] = useState('');
  const [areas, setAreas] = useState<string[]>([]);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [moveFrom, setMoveFrom] = useState('');
  const [moveTo, setMoveTo] = useState('');
  const [sleep, setSleep] = useState<string | null>(null);
  const [social, setSocial] = useState<string | null>(null);
  const [tidy, setTidy] = useState<string | null>(null);
  const [smoking, setSmoking] = useState<string>('no_preference');
  const [pets, setPets] = useState<string>('no_preference');
  const [guests, setGuests] = useState<string | null>(null);
  const [genderPref, setGenderPref] = useState<string>('no_preference');
  const [tags, setTags] = useState<string[]>([]);
  const [published, setPublished] = useState(false);
  const [studentAudience, setStudentAudience] = useState<string>('both');
  const [housingStatus, setHousingStatus] = useState<string | null>(null);
  const [flatRent, setFlatRent] = useState('');
  const [flatPhotos, setFlatPhotos] = useState<DraftFlatPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // hydrate once from the loaded row / profile fallbacks — never hydrate off
  // a failed fetch, or a real saved profile would look wiped on a query error
  if (!ready && !mine.isLoading && !mine.isError) {
    const p = mine.data;
    setHeadline(p?.headline ?? '');
    setAbout(p?.about ?? '');
    setAreas(p?.preferred_areas ?? (profile?.campus_area ? [profile.campus_area] : []));
    setBudgetMin(String(p?.budget_min ?? profile?.budget_min ?? '') || '');
    setBudgetMax(String(p?.budget_max ?? profile?.budget_max ?? '') || '');
    setMoveFrom(p?.move_in_from ?? profile?.move_in_from ?? '');
    setMoveTo(p?.move_in_to ?? '');
    setSleep(p?.sleep_schedule ?? null);
    setSocial(p?.social_level ?? null);
    setTidy(p?.cleanliness != null ? String(p.cleanliness) : null);
    setSmoking(p?.smoking ?? 'no_preference');
    setPets(p?.pets ?? 'no_preference');
    setGuests(p?.guests_frequency ?? null);
    setGenderPref(p?.gender_preference ?? 'no_preference');
    setTags(p?.lifestyle_tags ?? profile?.interests ?? []);
    setPublished(p?.is_published ?? false);
    setStudentAudience(p?.student_audience ?? 'both');
    setHousingStatus(p?.housing_status ?? null);
    setFlatRent(p?.flat_rent_month != null ? String(p.flat_rent_month) : '');
    setFlatPhotos(
      (p?.flat_photos ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((ph) => ({
          uri: resolveImage(ph.storage_path, STORAGE_BUCKETS.roommateFlatImages) ?? ph.storage_path,
          existing: { id: ph.id, storagePath: ph.storage_path },
        })),
    );
    setReady(true);
  }

  const pickFlatPhotos = async () => {
    if (flatPhotos.length >= MAX_FLAT_PHOTOS) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      notify('Photos permission needed', 'Enable photo access in Settings to add pictures.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_FLAT_PHOTOS - flatPhotos.length,
      quality: IMAGE_UPLOAD.compressQuality,
    });
    if (result.canceled) return;
    const added: DraftFlatPhoto[] = result.assets.map((a) => ({ uri: a.uri, mimeType: a.mimeType }));
    setFlatPhotos((prev) => [...prev, ...added].slice(0, MAX_FLAT_PHOTOS));
  };

  const removeFlatPhoto = (i: number) => setFlatPhotos((prev) => prev.filter((_, idx) => idx !== i));

  const datesOk = dateOk(moveFrom) && dateOk(moveTo);

  const save = async () => {
    if (!user || !datesOk) return;
    setSaving(true);
    setError(null);
    try {
      const patch: RoommatePrefPatch = {
        headline: headline.trim() || null,
        about: about.trim() || null,
        preferred_city: profile?.city ?? null,
        preferred_areas: areas,
        university_id: profile?.university_id ?? null,
        budget_min: budgetMin ? Number(budgetMin) : null,
        budget_max: budgetMax ? Number(budgetMax) : null,
        move_in_from: moveFrom || null,
        move_in_to: moveTo || null,
        sleep_schedule: (sleep as RoommatePrefPatch['sleep_schedule']) ?? null,
        social_level: (social as RoommatePrefPatch['social_level']) ?? null,
        cleanliness: tidy ? Number(tidy) : null,
        smoking: smoking as RoommatePrefPatch['smoking'],
        pets: pets as RoommatePrefPatch['pets'],
        guests_frequency: (guests as RoommatePrefPatch['guests_frequency']) ?? null,
        gender_preference: genderPref as RoommatePrefPatch['gender_preference'],
        lifestyle_tags: tags,
        is_published: published,
        student_audience: studentAudience as RoommatePrefPatch['student_audience'],
        housing_status: (housingStatus as RoommatePrefPatch['housing_status']) ?? null,
        flat_rent_month: housingStatus === 'has_flat' && flatRent ? Number(flatRent) : null,
      };
      await roommatesApi.upsertPreferences(
        user.id,
        patch,
        housingStatus === 'has_flat' ? flatPhotos : [],
      );
      if (published) analytics.track('roommate_profile_published');
      await queryClient.invalidateQueries({ queryKey: ['roommates'] });
      await queryClient.invalidateQueries({ queryKey: qk.roommate(user.id) });
      router.back();
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Roommate Matching',
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerTintColor: theme.colors.textPrimary,
        }}
      />
      {mine.isError ? (
        <Screen>
          <ErrorState message="Couldn't load your roommate profile." onRetry={() => mine.refetch()} />
        </Screen>
      ) : mine.isLoading || !ready ? (
        <Screen>
          <LoadingState label="Loading your preferences…" />
        </Screen>
      ) : (
        <>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: theme.layout.screenPadding, paddingBottom: theme.spacing['5xl'], gap: theme.spacing.xl }}
            showsVerticalScrollIndicator={false}
          >
            {error ? <Banner tone="danger" message={error} /> : null}

            <Text variant="bodySm" muted>
              Set how you like to live. Publish when you’re ready to show up in other students’ matches.
            </Text>

            <Field label="Headline">
              <TextField
                value={headline}
                onChangeText={setHeadline}
                maxLength={120}
                placeholder="e.g. Tidy postgrad, quiet evenings, love to cook"
              />
            </Field>

            <Field label="About you">
              <TextField
                value={about}
                onChangeText={setAbout}
                multiline
                maxLength={2000}
                placeholder="A short intro for potential flatmates"
                style={{ minHeight: 100, textAlignVertical: 'top' }}
              />
            </Field>

            <Field label="Preferred areas">
              <ChipGroup
                multiple
                options={CYPRUS_AREAS.map((a) => ({ value: a, label: a }))}
                value={areas}
                onChange={(v) => setAreas(v as string[])}
              />
            </Field>

            <Field label="Who are you?" hint="Erasmus, full-time, or both — helps other students find you">
              <ChipGroup
                options={opts(STUDENT_AUDIENCE_OPTS)}
                value={studentAudience}
                onChange={one((v) => setStudentAudience(v ?? 'both'))}
              />
            </Field>

            <Field label="Do you already have a flat?" hint="Optional — helps us show you to the right people">
              <ChipGroup options={opts(HOUSING_STATUS_OPTS)} value={housingStatus} onChange={one(setHousingStatus)} />
            </Field>

            {housingStatus === 'has_flat' ? (
              <>
                <Field label="Rent for your flat (€ / month)">
                  <TextField
                    keyboardType="number-pad"
                    value={flatRent}
                    onChangeText={(v) => setFlatRent(v.replace(/[^0-9]/g, ''))}
                    placeholder="e.g. 450"
                  />
                </Field>
                <Field label="Photos of your flat" hint={`Up to ${MAX_FLAT_PHOTOS} photos`}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
                    {flatPhotos.map((photo, i) => (
                      <View key={photo.uri} style={{ width: 104, height: 104 }}>
                        <Image
                          source={{ uri: photo.uri }}
                          style={{ width: '100%', height: '100%', borderRadius: theme.radius.md }}
                          contentFit="cover"
                        />
                        <Pressable
                          onPress={() => removeFlatPhoto(i)}
                          hitSlop={6}
                          accessibilityLabel="Remove photo"
                          style={{
                            position: 'absolute',
                            top: -6,
                            right: -6,
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            backgroundColor: theme.colors.textPrimary,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons name="close" size={14} color={theme.colors.surface} />
                        </Pressable>
                      </View>
                    ))}
                    {flatPhotos.length < MAX_FLAT_PHOTOS ? (
                      <Pressable
                        onPress={pickFlatPhotos}
                        accessibilityLabel="Add photos"
                        style={{
                          width: 104,
                          height: 104,
                          borderRadius: theme.radius.md,
                          borderWidth: 1.5,
                          borderStyle: 'dashed',
                          borderColor: theme.colors.borderStrong,
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                        }}
                      >
                        <Ionicons name="image-outline" size={22} color={theme.colors.primary} />
                        <Text variant="caption" color={theme.colors.textSecondary}>
                          Add
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </Field>
              </>
            ) : null}

            <Field label="Budget (€ / month)">
              <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                <TextField
                  containerStyle={{ flex: 1 }}
                  placeholder="Min"
                  keyboardType="number-pad"
                  value={budgetMin}
                  onChangeText={(v) => setBudgetMin(v.replace(/[^0-9]/g, ''))}
                />
                <TextField
                  containerStyle={{ flex: 1 }}
                  placeholder="Max"
                  keyboardType="number-pad"
                  value={budgetMax}
                  onChangeText={(v) => setBudgetMax(v.replace(/[^0-9]/g, ''))}
                />
              </View>
            </Field>

            <Field label="Move-in window">
              <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                <View style={{ flex: 1 }}>
                  <DateField placeholder="From" value={moveFrom} onChange={setMoveFrom} />
                </View>
                <View style={{ flex: 1 }}>
                  <DateField
                    placeholder="To (optional)"
                    value={moveTo}
                    onChange={setMoveTo}
                    minimumDate={moveFrom ? parseISO(moveFrom) : undefined}
                  />
                </View>
              </View>
            </Field>

            <Field label="Daily routine">
              <ChipGroup options={opts(SLEEP_OPTS)} value={sleep} onChange={one(setSleep)} />
            </Field>
            <Field label="Social energy">
              <ChipGroup options={opts(SOCIAL_OPTS)} value={social} onChange={one(setSocial)} />
            </Field>
            <Field label="Tidiness">
              <ChipGroup options={opts(TIDY_OPTS)} value={tidy} onChange={one(setTidy)} />
            </Field>
            <Field label="Smoking">
              <ChipGroup
                options={opts(SMOKING_OPTS)}
                value={smoking}
                onChange={one((v) => setSmoking(v ?? 'no_preference'))}
              />
            </Field>
            <Field label="Pets">
              <ChipGroup
                options={opts(PETS_OPTS)}
                value={pets}
                onChange={one((v) => setPets(v ?? 'no_preference'))}
              />
            </Field>
            <Field label="Guests">
              <ChipGroup options={opts(GUESTS_OPTS)} value={guests} onChange={one(setGuests)} />
            </Field>
            <Field label="Flatmate gender preference">
              <ChipGroup
                options={opts(GENDER_PREF_OPTS)}
                value={genderPref}
                onChange={one((v) => setGenderPref(v ?? 'no_preference'))}
              />
            </Field>

            <Field label="Tags">
              <ChipGroup
                multiple
                options={LIFESTYLE_TAGS.map((t) => ({ value: t, label: tagLabel(t) }))}
                value={tags}
                onChange={(v) => setTags(v as string[])}
              />
            </Field>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
                backgroundColor: theme.colors.surfaceAlt,
                borderRadius: theme.radius.lg,
                padding: theme.spacing.lg,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text variant="h3" style={{ fontSize: 15 }}>
                  Publish my roommate profile
                </Text>
                <Text variant="caption" muted>
                  Other students can find and message you
                </Text>
              </View>
              <Switch
                value={published}
                onValueChange={setPublished}
                trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }}
                thumbColor={theme.colors.surface}
              />
            </View>
          </ScrollView>

          <View
            style={{
              padding: theme.spacing.lg,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            }}
          >
            <Button title="Save" loading={saving} disabled={!datesOk} onPress={save} />
          </View>
        </>
      )}
    </View>
  );
}
