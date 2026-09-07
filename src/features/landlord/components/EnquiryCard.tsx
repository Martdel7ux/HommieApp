import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Text, Avatar } from '@/components/ui';
import { useTheme } from '@/theme';
import { timeAgo } from '@/lib/datetime';
import type { LandlordEnquiry } from '../types';

function InfoChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.radius.pill,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 3,
      }}
    >
      <Ionicons name={icon} size={12} color={theme.colors.primary} />
      <Text variant="caption" color={theme.colors.textSecondary}>
        {label}
      </Text>
    </View>
  );
}

function budgetLabel(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return `€${min}–${max}`;
  if (max != null) return `up to €${max}`;
  if (min != null) return `from €${min}`;
  return null;
}

export function EnquiryCard({
  enquiry,
  showListing = true,
  onPress,
}: {
  enquiry: LandlordEnquiry;
  showListing?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { student } = enquiry;
  const name = student.first_name ?? 'A student';
  const budget = budgetLabel(student.budget_min, student.budget_max);

  return (
    <Card onPress={onPress} style={{ gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        {!enquiry.is_read ? (
          <View
            style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary }}
          />
        ) : null}
        <Avatar uri={student.avatar_url} name={name} size={36} />
        <View style={{ flex: 1 }}>
          <Text variant="bodySm" weight={enquiry.is_read ? '500' : '700'}>
            {name}
          </Text>
          {showListing ? (
            <Text variant="caption" muted numberOfLines={1}>
              {enquiry.listing_title}
            </Text>
          ) : null}
        </View>
        <Text variant="caption" muted>
          {timeAgo(enquiry.created_at)}
        </Text>
      </View>

      <Text variant="bodySm" muted numberOfLines={2}>
        {enquiry.message}
      </Text>

      {student.university || student.move_in_from || budget ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
          {student.university ? <InfoChip icon="school-outline" label={student.university} /> : null}
          {student.move_in_from ? (
            <InfoChip icon="calendar-outline" label={`Move-in ${student.move_in_from}`} />
          ) : null}
          {budget ? <InfoChip icon="wallet-outline" label={budget} /> : null}
        </View>
      ) : null}
    </Card>
  );
}
