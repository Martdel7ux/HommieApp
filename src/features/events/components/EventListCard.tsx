import React from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import { eventDateBadge, eventTimeRange } from '@/lib/datetime';
import { eventCover, type EventCard } from '../api';

export function EventListCard({ event, onPress }: { event: EventCard; onPress: () => void }) {
  const theme = useTheme();
  const cover = eventCover(event);
  const { day, month } = eventDateBadge(event.starts_at);
  const place = [event.area, event.city].filter(Boolean).join(', ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${day} ${month}, ${place}`}
      style={({ pressed }) => ({ borderRadius: theme.radius.xl, opacity: pressed ? 0.97 : 1, ...theme.shadows.sm })}
    >
      <View
        style={{
          borderRadius: theme.radius.xl,
          overflow: 'hidden',
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <View>
          {cover ? (
            <Image
              source={{ uri: cover }}
              style={{ width: '100%', height: 150, backgroundColor: theme.colors.primarySubtle }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={{ width: '100%', height: 150, backgroundColor: theme.colors.primarySubtle }} />
          )}
          <View
            style={{
              position: 'absolute',
              top: theme.spacing.md,
              left: theme.spacing.md,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.md,
              paddingHorizontal: 10,
              paddingVertical: 6,
              alignItems: 'center',
              minWidth: 48,
              ...theme.shadows.sm,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '800' }} color={theme.colors.primary}>
              {day}
            </Text>
            <Text variant="overline" color={theme.colors.textSecondary}>
              {month}
            </Text>
          </View>
        </View>

        <View style={{ padding: theme.spacing.lg, gap: 6 }}>
          <Text variant="h3" numberOfLines={2} style={{ fontSize: 16 }}>
            {event.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name="time-outline" size={14} color={theme.colors.textTertiary} />
            <Text variant="bodySm" muted>
              {eventTimeRange(event.starts_at, event.ends_at)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name="location-outline" size={14} color={theme.colors.textTertiary} />
            <Text variant="bodySm" muted numberOfLines={1}>
              {event.location_name}
              {place ? ` · ${place}` : ''}
            </Text>
          </View>
          {event.rsvp_count > 0 ? (
            <Text variant="caption" color={theme.colors.primary} style={{ marginTop: 2 }}>
              {event.rsvp_count} going
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
