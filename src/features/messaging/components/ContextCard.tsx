import React from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import type { ConversationDetail } from '../types';

export function ContextCard({
  card,
  onPress,
}: {
  card: NonNullable<ConversationDetail['contextCard']>;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        backgroundColor: theme.colors.primarySubtle,
        borderRadius: theme.radius.xl,
        padding: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: theme.radius.md,
          overflow: 'hidden',
          backgroundColor: theme.colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {card.image ? (
          <Image source={{ uri: card.image }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : (
          <Ionicons
            name={card.kind === 'accommodation' ? 'home' : 'pricetag'}
            size={22}
            color={theme.colors.primary}
          />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="h3" numberOfLines={1} style={{ fontSize: 15 }}>
          {card.title}
        </Text>
        <Text variant="bodySm" muted>
          {card.subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
    </Pressable>
  );
}
