import { Platform, ViewStyle } from 'react-native';

/** Cross-platform elevation presets. */
function shadow(elevation: number, opacity: number, radius: number, y: number): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: '#101413',
      shadowOffset: { width: 0, height: y },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: { elevation },
    default: {},
  }) as ViewStyle;
}

export const shadows = {
  none: {} as ViewStyle,
  sm: shadow(1, 0.06, 4, 1),
  md: shadow(3, 0.1, 12, 4),
  lg: shadow(8, 0.14, 24, 10),
} as const;

export type ShadowToken = keyof typeof shadows;
