import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import type { EventCard } from '../api';

function dateParts(iso: string) {
  const d = new Date(iso);
  return {
    day: d.getDate().toString(),
    month: d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
  };
}

export function EventRow({ event, onPress }: { event: EventCard; onPress?: () => void }) {
  const theme = useTheme();
  const { day, month } = dateParts(event.starts_at);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${day} ${month}, ${event.area ?? event.city}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.md,
        opacity: pressed ? 0.95 : 1,
        ...theme.shadows.sm,
      })}
    >
      <View
        style={{
          width: 54,
          height: 54,
          borderRadius: 12,
          backgroundColor: theme.colors.primarySubtle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '800' }} color={theme.colors.primarySubtleInk}>
          {day}
        </Text>
        <Text variant="overline" color={theme.colors.primarySubtleInk}>
          {month}
        </Text>
      </View>

      <View style={{ flex: 1, gap: 3 }}>
        <Text variant="h3" numberOfLines={1} style={{ fontSize: 15 }}>
          {event.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="location-outline" size={13} color={theme.colors.textTertiary} />
          <Text variant="bodySm" muted numberOfLines={1}>
            {event.area ? `${event.area}, ` : ''}
            {event.city}
          </Text>
        </View>
      </View>

      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: theme.colors.borderStrong,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="arrow-forward" size={16} color={theme.colors.textSecondary} />
      </View>
    </Pressable>
  );
}
