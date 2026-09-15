import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { parseISO } from 'date-fns';
import { Screen, Text, Button, TextField, DateField, Select, ChipGroup, Banner } from '@/components/ui';
import { useTheme } from '@/theme';
import { qk } from '@/lib/queryClient';
import { profileApi } from '@/features/profile/api';
import { analytics } from '@/services/analytics';
import { toAppError } from '@/services/errors';
import { AMENITIES, CYPRUS_AREAS, CYPRUS_CITIES, IMAGE_UPLOAD } from '@/config/constants';
import { amenityLabels, enumOptions, propertyTypeLabels } from '@/config/labels';
import type { PropertyType } from '@/types/database';
import { useSaveListing } from '../hooks';
import { stepValid } from '../listingForm';
import type { DraftPhoto, ListingDraft } from '../types';

const STEPS = ['Basics', 'Place & rooms', 'Location', 'Photos', 'Review'] as const;
const MAX_PHOTOS = IMAGE_UPLOAD.maxListingImages;

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

function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 20,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const theme = useTheme();
  const btn = {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  } as const;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text variant="body">{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <Pressable
          style={btn}
          onPress={() => onChange(Math.max(min, value - 1))}
          accessibilityLabel={`Decrease ${label}`}
        >
          <Ionicons name="remove" size={18} color={theme.colors.textPrimary} />
        </Pressable>
        <Text variant="body" weight="600" style={{ minWidth: 20, textAlign: 'center' }}>
          {value}
        </Text>
        <Pressable
          style={btn}
          onPress={() => onChange(Math.min(max, value + 1))}
          accessibilityLabel={`Increase ${label}`}
        >
          <Ionicons name="add" size={18} color={theme.colors.textPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

function SwitchRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text variant="body" style={{ flex: 1 }}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.colors.primary, false: theme.colors.surfaceSunken }}
      />
    </View>
  );
}

export function ListingWizard({
  mode,
  initialDraft,
  listingId,
  onDone,
  onExit,
}: {
  mode: 'create' | 'edit';
  initialDraft: ListingDraft;
  listingId?: string;
  /** Called with the listing id once saved (draft or published). */
  onDone: (id: string) => void;
  /** Called when the user backs out of step 1. */
  onExit: () => void;
}) {
  const theme = useTheme();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ListingDraft>(initialDraft);
  const [error, setError] = useState<string | null>(null);

  const save = useSaveListing(mode, listingId);

  const set = <K extends keyof ListingDraft>(k: K, v: ListingDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  useEffect(() => {
    if (mode === 'create') analytics.track('landlord_listing_create_started');
  }, [mode]);

  const { data: universities } = useQuery({
    queryKey: qk.universities,
    queryFn: profileApi.getUniversities,
  });
  const uniOptions = useMemo(
    () =>
      (universities ?? []).map((u) => ({
        value: u.id,
        label: u.name,
        sublabel: `${u.city}${u.campus_area ? ` · ${u.campus_area}` : ''}`,
      })),
    [universities],
  );

  const canAdvance = stepValid(step, draft);

  const pickPhotos = async () => {
    if (draft.photos.length >= MAX_PHOTOS) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos permission needed', 'Enable photo access in Settings to add pictures.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - draft.photos.length,
      quality: IMAGE_UPLOAD.compressQuality,
    });
    if (result.canceled) return;
    const added: DraftPhoto[] = result.assets.map((a) => ({ uri: a.uri, mimeType: a.mimeType }));
    set('photos', [...draft.photos, ...added].slice(0, MAX_PHOTOS));
  };

  const removePhoto = (i: number) =>
    set(
      'photos',
      draft.photos.filter((_, idx) => idx !== i),
    );

  const submit = (publish: boolean) => {
    setError(null);
    save.mutate(
      { draft, publish },
      {
        onSuccess: (id) => onDone(id),
        onError: (e) => setError(toAppError(e).message),
      },
    );
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      analytics.track('landlord_listing_step_completed', { step });
      setStep(step + 1);
    }
  };

  return (
    <Screen keyboardAvoiding padded={false} edges={['top', 'bottom']}>
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: theme.layout.screenPadding, gap: theme.spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
            <Pressable
              onPress={() => (step === 0 ? onExit() : setStep(step - 1))}
              hitSlop={10}
              accessibilityLabel="Back"
            >
              <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
            </Pressable>
            <View style={{ flex: 1, flexDirection: 'row', gap: theme.spacing.xs }}>
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: i <= step ? theme.colors.primary : theme.colors.surfaceSunken,
                  }}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: 4 }}>
            <Text variant="caption" muted>
              Step {step + 1} of {STEPS.length}
            </Text>
            <Text variant="h1">{STEPS[step]}</Text>
          </View>

          {error ? <Banner tone="danger" message={error} /> : null}
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: theme.layout.screenPadding,
            paddingBottom: theme.spacing['4xl'],
            gap: theme.spacing.lg,
          }}
        >
          {step === 0 && (
            <>
              <TextField
                label="Listing title"
                value={draft.title}
                onChangeText={(v) => set('title', v)}
                placeholder="e.g. Bright 2-bed near UNIC"
                maxLength={120}
              />
              <Field label="Property type">
                <ChipGroup<PropertyType>
                  options={enumOptions(propertyTypeLabels)}
                  value={draft.property_type}
                  onChange={(v) => set('property_type', v as PropertyType)}
                />
              </Field>
              <TextField
                label="Description"
                value={draft.description}
                onChangeText={(v) => set('description', v)}
                placeholder="Describe the place, the area, who it suits…"
                multiline
                maxLength={4000}
                style={{ minHeight: 120, textAlignVertical: 'top' }}
              />
            </>
          )}

          {step === 1 && (
            <>
              <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                <TextField
                  containerStyle={{ flex: 1 }}
                  label="Rent / month (€)"
                  keyboardType="number-pad"
                  value={draft.rent_month}
                  onChangeText={(v) => set('rent_month', v.replace(/[^0-9]/g, ''))}
                />
                <TextField
                  containerStyle={{ flex: 1 }}
                  label="Deposit (€, optional)"
                  keyboardType="number-pad"
                  value={draft.deposit}
                  onChangeText={(v) => set('deposit', v.replace(/[^0-9]/g, ''))}
                />
              </View>

              <SwitchRow
                label="Bills included in rent"
                value={draft.bills_included}
                onChange={(v) => set('bills_included', v)}
              />
              {draft.bills_included ? (
                <TextField
                  label="What's covered (optional)"
                  value={draft.bills_note}
                  onChangeText={(v) => set('bills_note', v)}
                  placeholder="e.g. Water and communal, electricity capped at €40"
                />
              ) : null}

              <Field label="Rooms">
                <View style={{ gap: theme.spacing.md }}>
                  <Stepper label="Bedrooms" value={draft.bedrooms} onChange={(v) => set('bedrooms', v)} />
                  <Stepper
                    label="Bathrooms"
                    value={draft.bathrooms}
                    onChange={(v) => set('bathrooms', v)}
                  />
                </View>
              </Field>

              <SwitchRow
                label="Furnished"
                value={draft.furnished}
                onChange={(v) => set('furnished', v)}
              />
              <SwitchRow
                label="Suitable for sharing / roommates"
                value={draft.roommate_suitable}
                onChange={(v) => set('roommate_suitable', v)}
              />
              <TextField
                label="Max occupants (optional)"
                keyboardType="number-pad"
                value={draft.max_occupants}
                onChangeText={(v) => set('max_occupants', v.replace(/[^0-9]/g, ''))}
              />
            </>
          )}

          {step === 2 && (
            <>
              <Select
                label="City"
                options={CYPRUS_CITIES.map((c) => ({ value: c, label: c }))}
                value={draft.city}
                onChange={(v) => set('city', v)}
              />
              <Select
                label="Area / neighbourhood"
                options={CYPRUS_AREAS.map((a) => ({ value: a, label: a }))}
                value={draft.area}
                onChange={(v) => set('area', v)}
              />

              <Field
                label="Approximate location"
                hint="Drag the pin to roughly where the place is. Students only ever see the area, never the exact address."
              >
                <View
                  style={{
                    height: 200,
                    borderRadius: theme.radius.lg,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  }}
                >
                  <MapView
                    style={{ flex: 1 }}
                    toolbarEnabled={false}
                    initialRegion={{
                      latitude: draft.approx_lat,
                      longitude: draft.approx_lng,
                      latitudeDelta: 0.05,
                      longitudeDelta: 0.05,
                    }}
                    onPress={(e) => {
                      set('approx_lat', e.nativeEvent.coordinate.latitude);
                      set('approx_lng', e.nativeEvent.coordinate.longitude);
                    }}
                  >
                    <Marker
                      draggable
                      coordinate={{ latitude: draft.approx_lat, longitude: draft.approx_lng }}
                      onDragEnd={(e) => {
                        set('approx_lat', e.nativeEvent.coordinate.latitude);
                        set('approx_lng', e.nativeEvent.coordinate.longitude);
                      }}
                    />
                  </MapView>
                </View>
              </Field>

              <TextField
                label="Address (private — never shown publicly)"
                value={draft.address_line}
                onChangeText={(v) => set('address_line', v)}
                placeholder="Street and number"
              />

              <Select
                label="Nearest university (optional)"
                options={uniOptions}
                value={draft.nearest_university_id}
                onChange={(v) => set('nearest_university_id', v)}
              />
              <TextField
                label="Distance to campus (km, optional)"
                keyboardType="decimal-pad"
                value={draft.distance_to_campus_km}
                onChangeText={(v) => set('distance_to_campus_km', v.replace(/[^0-9.]/g, ''))}
              />

              <Field label="Amenities">
                <ChipGroup
                  multiple
                  options={AMENITIES.map((a) => ({ value: a, label: amenityLabels[a] ?? a }))}
                  value={draft.amenities}
                  onChange={(v) => set('amenities', v as string[])}
                />
              </Field>

              <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                <View style={{ flex: 1 }}>
                  <DateField
                    label="Available from"
                    placeholder="Select date"
                    value={draft.available_from}
                    onChange={(v) => set('available_from', v)}
                    minimumDate={new Date()}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <DateField
                    label="Available to (optional)"
                    placeholder="Select date"
                    value={draft.available_to}
                    onChange={(v) => set('available_to', v)}
                    minimumDate={draft.available_from ? parseISO(draft.available_from) : new Date()}
                  />
                </View>
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <Text muted>Add at least one photo. The first one is the cover students see.</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
                {draft.photos.map((photo, i) => (
                  <View key={photo.uri} style={{ width: 104, height: 104 }}>
                    <Image
                      source={{ uri: photo.uri }}
                      style={{ width: '100%', height: '100%', borderRadius: theme.radius.md }}
                      contentFit="cover"
                    />
                    <Pressable
                      onPress={() => removePhoto(i)}
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
                    {i === 0 ? (
                      <View
                        style={{
                          position: 'absolute',
                          bottom: 4,
                          left: 4,
                          backgroundColor: theme.colors.primary,
                          borderRadius: theme.radius.sm,
                          paddingHorizontal: 5,
                          paddingVertical: 1,
                        }}
                      >
                        <Text variant="overline" color={theme.colors.onPrimary}>
                          Cover
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ))}
                {draft.photos.length < MAX_PHOTOS ? (
                  <Pressable
                    onPress={pickPhotos}
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
              <Text variant="caption" muted>
                Up to {MAX_PHOTOS} photos.
              </Text>
            </>
          )}

          {step === 4 && <ReviewStep draft={draft} />}
        </ScrollView>

        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.md,
            padding: theme.layout.screenPadding,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          }}
        >
          {step < STEPS.length - 1 ? (
            <Button
              title="Continue"
              style={{ flex: 1 }}
              disabled={!canAdvance}
              onPress={next}
            />
          ) : (
            <>
              <Button
                title="Save draft"
                variant="secondary"
                style={{ flex: 1 }}
                loading={save.isPending}
                onPress={() => submit(false)}
              />
              <Button
                title="Submit for Review"
                style={{ flex: 1 }}
                loading={save.isPending}
                onPress={() => submit(true)}
              />
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}

function ReviewStep({ draft }: { draft: ListingDraft }) {
  const theme = useTheme();
  const rows: [string, string][] = [
    ['Title', draft.title || '—'],
    ['Type', draft.property_type ? propertyTypeLabels[draft.property_type] : '—'],
    ['Rent', draft.rent_month ? `€${draft.rent_month}/month` : '—'],
    ['Deposit', draft.deposit ? `€${draft.deposit}` : '—'],
    ['Bills included', draft.bills_included ? 'Yes' : 'No'],
    ['Rooms', `${draft.bedrooms} bed · ${draft.bathrooms} bath`],
    ['Furnished', draft.furnished ? 'Yes' : 'No'],
    ['Roommate-friendly', draft.roommate_suitable ? 'Yes' : 'No'],
    ['Location', [draft.area, draft.city].filter(Boolean).join(', ') || '—'],
    ['Amenities', draft.amenities.length ? `${draft.amenities.length} selected` : 'None'],
    ['Available from', draft.available_from || 'Not set'],
    ['Photos', String(draft.photos.length)],
  ];
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text muted>Check everything, then save as a draft or publish it live.</Text>
      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          overflow: 'hidden',
        }}
      >
        {rows.map(([k, v], i) => (
          <View
            key={k}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: theme.spacing.md,
              padding: theme.spacing.md,
              backgroundColor: i % 2 ? theme.colors.surface : theme.colors.surfaceAlt,
            }}
          >
            <Text variant="bodySm" muted>
              {k}
            </Text>
            <Text variant="bodySm" weight="500" style={{ flex: 1, textAlign: 'right' }}>
              {v}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
