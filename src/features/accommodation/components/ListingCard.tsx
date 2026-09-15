import React from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import { propertyTypeLabels, amenityLabels } from '@/config/labels';
import { coverImage, locationLabel } from '../api';
import { landlordDisplayName } from '../landlordDisplay';
import type { AccommodationCard } from '../types';

interface Props {
  listing: AccommodationCard;
  saved?: boolean;
  onPress?: () => void;
  onToggleSave?: () => void;
  onPressLandlord?: () => void;
  layout?: 'carousel' | 'list';
}

/** Compact chips for the carousel card. */
function compactChips(l: AccommodationCard): string[] {
  const chips = [l.bedrooms === 0 ? 'Studio' : `${l.bedrooms} Bed`, `${l.bathrooms} Bath`];
  if (l.furnished) chips.push('Furnished');
  else if (l.bills_included) chips.push('Bills incl.');
  return chips;
}

/** Feature-style chips for the full list card (matches the Figma). */
function featureChips(l: AccommodationCard): string[] {
  const chips: string[] = [];
  if (l.bills_included) chips.push('Bills Included');
  if (l.furnished) chips.push('Furnished');
  for (const a of ['pet_friendly', 'parking', 'wifi', 'private_bathroom', 'study_desk'] as const) {
    if (chips.length >= 3) break;
    if (l.amenities.includes(a)) chips.push(a === 'wifi' ? 'WiFi Incl.' : amenityLabels[a]);
  }
  if (chips.length === 0) chips.push(propertyTypeLabels[l.property_type]);
  return chips.slice(0, 3);
}

function VerifiedBadge() {
  const theme = useTheme();
  return (
    <View
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: theme.colors.success,
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
      }}
    >
      <Ionicons name="checkmark-circle" size={12} color={theme.colors.textInverse} />
      <Text variant="overline" color={theme.colors.textInverse}>
        Verified
      </Text>
    </View>
  );
}

function SaveButton({ saved, onPress }: { saved?: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Remove from saved' : 'Save listing'}
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.sm,
      }}
    >
      <Ionicons
        name={saved ? 'heart' : 'heart-outline'}
        size={18}
        color={saved ? theme.colors.danger : theme.colors.textSecondary}
      />
    </Pressable>
  );
}

export function ListingCard({
  listing,
  saved,
  onPress,
  onToggleSave,
  onPressLandlord,
  layout = 'carousel',
}: Props) {
  const theme = useTheme();
  const uri = coverImage(listing);
  const verified = listing.landlord?.landlord_profile?.verification === 'verified';
  const carousel = layout === 'carousel';
  const landlordName = listing.landlord ? landlordDisplayName(listing.landlord) : null;

  const price = (
    <Text style={{ fontSize: carousel ? 15 : 19, fontWeight: '800' }} color={theme.colors.primary}>
      €{listing.rent_month}
      <Text variant="caption" muted>
        {' '}
        /mo
      </Text>
    </Text>
  );

  const imageBlock = (
    <View style={{ height: carousel ? 146 : 188, backgroundColor: theme.colors.surfaceSunken }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={160} />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="image-outline" size={28} color={theme.colors.textTertiary} />
        </View>
      )}
      {verified ? <VerifiedBadge /> : null}
      {onToggleSave ? <SaveButton saved={saved} onPress={onToggleSave} /> : null}
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${listing.rent_month} euro per month, ${locationLabel(listing)}`}
      style={({ pressed }) => ({
        width: carousel ? 272 : undefined,
        height: carousel ? 254 : undefined,
        alignSelf: carousel ? undefined : 'stretch',
        borderRadius: 16,
        opacity: pressed ? 0.96 : 1,
        ...theme.shadows.sm,
      })}
    >
      {/* inner wrapper clips image corners; the Pressable keeps the shadow */}
      <View
        style={{
          flex: carousel ? 1 : undefined,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        {imageBlock}

        {carousel ? (
          <View style={{ flex: 1, padding: theme.spacing.md, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm }}>
              <Text variant="h3" numberOfLines={1} style={{ flex: 1, fontSize: 15 }}>
                {listing.title}
              </Text>
              {price}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="location-outline" size={13} color={theme.colors.textTertiary} />
              <Text variant="bodySm" muted numberOfLines={1}>
                {locationLabel(listing)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
              {compactChips(listing).map((c) => (
                <View
                  key={c}
                  style={{
                    backgroundColor: theme.colors.surfaceSunken,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 7,
                  }}
                >
                  <Text variant="caption" color={theme.colors.textSecondary}>
                    {c}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md }}>
              <Text variant="h3" numberOfLines={2} style={{ flex: 1, fontSize: 17 }}>
                {listing.title}
              </Text>
              <View style={{ paddingTop: 1 }}>{price}</View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="location-outline" size={14} color={theme.colors.textTertiary} />
              <Text variant="bodySm" muted numberOfLines={1}>
                {locationLabel(listing)}
              </Text>
            </View>

            {landlordName ? (
              <Pressable
                onPress={onPressLandlord}
                disabled={!onPressLandlord}
                hitSlop={4}
                accessibilityRole={onPressLandlord ? 'button' : undefined}
                accessibilityLabel={`Listed by ${landlordName}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
              >
                <Text variant="caption" muted numberOfLines={1}>
                  Listed by{' '}
                  <Text variant="caption" color={onPressLandlord ? theme.colors.primary : theme.colors.textTertiary}>
                    {landlordName}
                  </Text>
                </Text>
              </Pressable>
            ) : null}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 }}>
              {featureChips(listing).map((c) => (
                <View
                  key={c}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 8,
                  }}
                >
                  <Text variant="bodySm" color={theme.colors.textSecondary}>
                    {c}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
}
