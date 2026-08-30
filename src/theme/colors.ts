/**
 * Hommie colour tokens.
 *
 * Brand hue is derived from the Hommie logo (`assets/logo.png`): indigo #4F46E5.
 * Spacing, typography and the finer palette steps are still provisional pending
 * the full `hommiebrand/` guidelines + Figma. Every screen consumes semantic
 * tokens (never raw hex), so a re-skin is a single-file change.
 */

const palette = {
  // Brand — indigo ramp around the logo colour (#4F46E5 == brand500)
  brand900: '#1E1B4B',
  brand700: '#3730A3',
  brand600: '#443CD9', // deep fill for primary tiles / CTAs
  brand500: '#4F46E5', // primary — exact logo colour
  brand300: '#A5B4FC',
  brand100: '#E0E7FF',
  brand50: '#EEF2FF',

  // Violet — used for the "Events" surface family
  violet200: '#C7BEF5',
  violet700: '#4B3DA0',

  // Accent (warm, for highlights / events) — complements the indigo
  accent500: '#F59E0B',
  accent100: '#FDECC8',

  // Neutrals — very slight indigo bias so greys read as chosen, not default
  ink900: '#16151D',
  ink700: '#3B3A45',
  ink500: '#6B6A78',
  ink300: '#9E9DAB',
  ink200: '#C9C8D3',
  ink100: '#E8E7EE',
  ink50: '#F5F5F8',
  white: '#FFFFFF',
  black: '#000000',

  // Status
  success500: '#2E9E5B',
  success100: '#DBF1E3',
  warning500: '#E0A100',
  warning100: '#FBEFCB',
  danger500: '#E0524D',
  danger100: '#FBE0DE',
  info500: '#0EA5E9',
  info100: '#DEF1FC',
} as const;

export const lightColors = {
  // Surfaces
  background: palette.ink50,
  surface: palette.white,
  surfaceAlt: palette.brand50,
  surfaceSunken: palette.ink100,
  overlay: 'rgba(20, 26, 25, 0.45)',

  // Text
  textPrimary: palette.ink900,
  textSecondary: palette.ink500,
  textTertiary: palette.ink300,
  textInverse: palette.white,
  textOnBrand: palette.white,

  // Brand
  primary: palette.brand500,
  primaryBold: palette.brand600,
  primaryPressed: palette.brand700,
  primarySubtle: palette.brand100,
  primarySubtleInk: palette.brand700,
  onPrimary: palette.white,

  accent: palette.accent500,
  accentSubtle: palette.accent100,

  // Tile surfaces (Home quick actions, category chips)
  tileEventsBg: palette.violet200,
  tileEventsInk: palette.violet700,

  // Feedback / semantic on light surfaces
  online: palette.success500,

  // Borders / dividers
  border: palette.ink100,
  borderStrong: palette.ink200,
  focusRing: palette.brand500,

  // Status
  success: palette.success500,
  successSubtle: palette.success100,
  warning: palette.warning500,
  warningSubtle: palette.warning100,
  danger: palette.danger500,
  dangerSubtle: palette.danger100,
  info: palette.info500,
  infoSubtle: palette.info100,

  // Misc
  skeleton: palette.ink100,
  ratingStar: palette.accent500,
  verifiedBadge: palette.info500,
} as const;

export type AppColors = { [K in keyof typeof lightColors]: string };

/**
 * Dark palette reserved for a future release. V1 ships light-only
 * (see `userInterfaceStyle: "light"` in app.config.ts). Keys stay in sync
 * with `lightColors`.
 */
export const darkColors: AppColors = {
  ...(lightColors as AppColors),
  background: '#0E0E17',
  surface: '#16161F',
  surfaceAlt: '#1D1B33',
  surfaceSunken: '#23222E',
  overlay: 'rgba(0, 0, 0, 0.6)',
  textPrimary: '#F5F5F8',
  textSecondary: '#9E9DAB',
  textTertiary: '#6B6A78',
  border: '#2A2937',
  borderStrong: '#3A3948',
  skeleton: '#2A2937',
};

export const colors = lightColors;
