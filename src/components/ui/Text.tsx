import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleProp, TextStyle } from 'react-native';
import { useTheme } from '@/theme';
import type { TypographyVariant } from '@/theme/typography';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: TextStyle['textAlign'];
  weight?: TextStyle['fontWeight'];
  muted?: boolean;
  style?: StyleProp<TextStyle>;
}

/** The only text primitive in the app. Screens never import RN `Text`. */
export function Text({
  variant = 'body',
  color,
  align,
  weight,
  muted,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const resolvedColor = color ?? (muted ? theme.colors.textSecondary : theme.colors.textPrimary);
  return (
    <RNText
      {...rest}
      allowFontScaling
      style={[
        theme.typography[variant],
        { color: resolvedColor },
        align ? { textAlign: align } : null,
        weight ? { fontWeight: weight } : null,
        style,
      ]}
    />
  );
}
