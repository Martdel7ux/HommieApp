/**
 * 4pt spacing scale. Use these tokens for padding, margin and gap.
 * ⚠️ Confirm against Figma spacing once `hommiebrand/` lands.
 */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
  '6xl': 72,
} as const;

export type SpacingToken = keyof typeof spacing;

/** Corner radii. */
export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radius;

/** Standard screen gutter. */
export const layout = {
  screenPadding: spacing.lg,
  maxContentWidth: 520,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
  tabBarHeight: 60,
  minTouchTarget: 44,
  /** Horizontal inset of the floating pill tab bar from the screen edges. */
  tabBarInset: 16,
  /** Height of the floating pill tab bar itself. */
  tabBarPillHeight: 62,
  /** Bottom padding scrollable tab screens need so content clears the floating bar. */
  tabBarClearance: 116,
} as const;
