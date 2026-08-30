import React from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import { itemCover, priceLabel } from '../api';
import type { MarketplaceCard as Card } from '../types';

export function MarketplaceCard({
  item,
  saved,
  onPress,
  onToggleSave,
}: {
  item: Card;
  saved: boolean;
  onPress: () => void;
  onToggleSave: () => void;
}) {
  const theme = useTheme();
  const cover = itemCover(item.images);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${priceLabel(item)}`}
      style={({ pressed }) => ({
        flex: 1,
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        opacity: pressed ? 0.97 : 1,
      })}
    >
      <View>
        {cover ? (
          <Image
            source={{ uri: cover }}
            style={{ width: '100%', aspectRatio: 1, backgroundColor: theme.colors.primarySubtle }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View
            style={{
              width: '100%',
              aspectRatio: 1,
              backgroundColor: theme.colors.primarySubtle,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="pricetag-outline" size={28} color={theme.colors.primary} />
          </View>
        )}

        {item.status === 'reserved' ? (
          <View
            style={{
              position: 'absolute',
              left: 8,
              top: 8,
              backgroundColor: theme.colors.warning,
              borderRadius: theme.radius.pill,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text variant="overline" color="#FFFFFF">
              Reserved
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={onToggleSave}
          hitSlop={8}
          accessibilityLabel={saved ? 'Remove from saved' : 'Save item'}
          style={{
            position: 'absolute',
            right: 8,
            top: 8,
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
            size={16}
            color={saved ? theme.colors.primary : theme.colors.textSecondary}
          />
        </Pressable>
      </View>

      <View style={{ padding: theme.spacing.md, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text variant="h3" numberOfLines={1} style={{ flex: 1, fontSize: 14.5 }}>
            {item.title}
          </Text>
          <Text style={{ fontSize: 14.5, fontWeight: '800' }} color={theme.colors.primary}>
            {priceLabel(item)}
          </Text>
        </View>
        {item.description ? (
          <Text variant="bodySm" muted numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
