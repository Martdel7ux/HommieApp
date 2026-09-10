import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text, Avatar } from '@/components/ui';
import { studyLevelLabels } from '@/config/labels';
import { matchSubtitle } from '../compatibility';
import type { RoommateMatch } from '../types';

export function RoommateMatchCard({
  match,
  online,
  onPress,
}: {
  match: RoommateMatch;
  online?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const p = match.profile;
  const name = p?.first_name ?? p?.display_name ?? 'Student';
  const level = p?.study_level ? studyLevelLabels[p.study_level] : undefined;
  const subtitle = matchSubtitle(match, level);
  const { score, pending } = match.compatibility;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        pending
          ? `${name}, calculating match`
          : `${name}, ${score}% estimated match. ${match.compatibility.reasons.join(', ')}`
      }
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
      <View>
        <Avatar uri={p?.avatar_url} name={name} size={52} />
        {online ? (
          <View
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              width: 13,
              height: 13,
              borderRadius: 7,
              backgroundColor: theme.colors.online,
              borderWidth: 2,
              borderColor: theme.colors.surface,
            }}
          />
        ) : null}
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text variant="h3" numberOfLines={1} style={{ fontSize: 15 }}>
            {name}
          </Text>
          <Ionicons name="checkmark-circle" size={15} color={theme.colors.verifiedBadge} />
        </View>
        <Text variant="bodySm" muted numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.primarySubtle,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 8,
          minWidth: 62,
        }}
      >
        <Text style={{ fontSize: 17, fontWeight: '800' }} color={theme.colors.primarySubtleInk}>
          {pending ? '··' : `${score}%`}
        </Text>
        <Text variant="overline" color={theme.colors.primarySubtleInk}>
          Match
        </Text>
      </View>
    </Pressable>
  );
}
