import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme';
import { resolveAvatar } from '@/lib/images';
import { Text } from './Text';

export function Avatar({
  uri,
  name,
  size = 44,
}: {
  uri?: string | null;
  name?: string | null;
  size?: number;
}) {
  const theme = useTheme();
  const resolvedUri = resolveAvatar(uri);
  const initials = (name ?? '?')
    .split(' ')
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.colors.primarySubtle,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {resolvedUri ? (
        <Image
          source={{ uri: resolvedUri }}
          style={{ width: size, height: size }}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <Text variant="label" color={theme.colors.primaryPressed} style={{ fontSize: size * 0.36 }}>
          {initials}
        </Text>
      )}
    </View>
  );
}
