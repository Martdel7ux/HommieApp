import React from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import { propertyTypeLabels } from '@/config/labels';
import { coverImage } from '../api';
import type { AccommodationCard } from '../types';

interface Props {
  listing: AccommodationCard;
  saved?: boolean;
  onPress?: () => void;
  onToggleSave?: () => void;
  layout?: 'carousel' | 'list';
}

function featureChips(l: AccommodationCard): string[] {
  const chips: string[] = [];
  if (l.bedrooms === 0) chips.push('Studio');
  else chips.push(`${l.bedrooms} Bed`);
  chips.push(`${l.bathrooms} Bath`);
  if (l.furnished) chips.push('Furnished');
  else if (l.bills_included) chips.push('Bills incl.');
  return chips;
}

export function ListingCard({ listing, saved, onPress, onToggleSave, layout = 'carousel' }: Props) {
  const theme = useTheme();
  const uri = coverImage(listing);
  const verified = listing.landlord?.landlord_profile?.verification === 'verified';
  const width = layout === 'carousel' ? 272 : undefined;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${listing.rent_month} euro per month, ${listing.area}, ${listing.city}`}
      style={({ pressed }) => ({
        width,
        alignSelf: layout === 'list' ? 'stretch' : undefined,
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
        opacity: pressed ? 0.95 : 1,
        ...theme.shadows.sm,
      })}
    >
      <View style={{ height: 150, backgroundColor: theme.colors.surfaceSunken }}>
        {uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={160} />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="image-outline" size={26} color={theme.colors.textTertiary} />
          </View>
        )}

        {verified ? (
          <View
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: theme.colors.success,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 999,
            }}
          >
            <Ionicons name="checkmark-circle" size={12} color={theme.colors.textInverse} />
            <Text variant="overline" color={theme.colors.textInverse}>
              Verified
            </Text>
          </View>
        ) : null}

        {onToggleSave ? (
          <Pressable
            onPress={onToggleSave}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Remove from saved' : 'Save listing'}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: theme.colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              ...theme.shadows.sm,
            }}
          >
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={17}
              color={saved ? theme.colors.danger : theme.colors.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>

      <View style={{ padding: theme.spacing.md, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm }}>
          <Text variant="h3" numberOfLines={1} style={{ flex: 1, fontSize: 15 }}>
            {listing.title}
          </Text>
          <Text style={{ fontSize: 15, fontWeight: '700' }} color={theme.colors.primary}>
            €{listing.rent_month}
            <Text variant="caption" muted>
              {' '}
              /mo
            </Text>
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="location-outline" size={13} color={theme.colors.textTertiary} />
          <Text variant="bodySm" muted numberOfLines={1}>
            {listing.area}, {listing.city} · {propertyTypeLabels[listing.property_type]}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
          {featureChips(listing).map((c) => (
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
    </Pressable>
  );
}
