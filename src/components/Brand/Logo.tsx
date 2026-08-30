import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

const MARK = require('../../../assets/logo.png');
const MARK_WHITE = require('../../../assets/logo-white.png');
// Source glyph aspect ratio (assets/logo.png is 440 x 453).
const RATIO = 440 / 453;

/**
 * The Hommie brand mark (the "H" glyph from `assets/logo.png`), optionally with
 * the wordmark beside it. Colour comes from the asset — `inverse` swaps to the
 * white glyph for use on dark / brand-coloured surfaces.
 */
export function Logo({
  size = 32,
  withWordmark = false,
  inverse = false,
  style,
}: {
  size?: number;
  withWordmark?: boolean;
  inverse?: boolean;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const mark = (
    <Image
      source={inverse ? MARK_WHITE : MARK}
      style={{ width: size * RATIO, height: size }}
      contentFit="contain"
      accessibilityLabel="Hommie"
    />
  );

  if (!withWordmark) return <View style={style}>{mark}</View>;

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: size * 0.28 }, style]}>
      {mark}
      <Text
        variant="h1"
        color={inverse ? theme.colors.textInverse : theme.colors.textPrimary}
        style={{ fontSize: size * 0.86, letterSpacing: -0.5 }}
      >
        Hommie
      </Text>
    </View>
  );
}
