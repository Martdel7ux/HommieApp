import { View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Card, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import { coverImage } from '@/features/accommodation/api';
import { propertyTypeLabels } from '@/config/labels';
import { ListingStatusPill } from './ListingStatusPill';
import type { LandlordListingCard as Card_ } from '../types';

function Stat({ icon, value }: { icon: keyof typeof Ionicons.glyphMap; value: number }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name={icon} size={13} color={theme.colors.textTertiary} />
      <Text variant="caption" muted>
        {value}
      </Text>
    </View>
  );
}

export function LandlordListingCard({ listing, onPress }: { listing: Card_; onPress: () => void }) {
  const theme = useTheme();
  const cover = coverImage(listing);

  return (
    <Card onPress={onPress} padded={false} style={{ overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row' }}>
        {cover ? (
          <Image source={{ uri: cover }} style={{ width: 104, height: 104 }} contentFit="cover" />
        ) : (
          <View
            style={{
              width: 104,
              height: 104,
              backgroundColor: theme.colors.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="image-outline" size={24} color={theme.colors.textTertiary} />
          </View>
        )}

        <View style={{ flex: 1, padding: theme.spacing.md, gap: 6 }}>
          <ListingStatusPill status={listing.status} />
          <Text variant="bodySm" weight="600" numberOfLines={1}>
            {listing.title}
          </Text>
          <Text variant="caption" muted numberOfLines={1}>
            €{listing.rent_month}/mo · {propertyTypeLabels[listing.property_type]} · {listing.area}
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: 2 }}>
            <Stat icon="eye-outline" value={listing.views_count} />
            <Stat icon="heart-outline" value={listing.saves_count} />
            <Stat icon="mail-outline" value={listing.enquiries_count} />
          </View>
        </View>
      </View>
    </Card>
  );
}
