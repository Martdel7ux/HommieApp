import { TextStyle } from 'react-native';

/**
 * Hommie type scale.
 *
 * ⚠️ PLACEHOLDER — the brief specifies a brand typeface in `hommiebrand/`.
 * Until the font files are added to `assets/fonts/` and registered in
 * `src/theme/fonts.ts`, we fall back to the system font. Swap `fontFamily`
 * values here once the real faces are wired up.
 */

export const fontFamily = {
  regular: 'System',
  medium: 'System',
  semibold: 'System',
  bold: 'System',
} as const;

type Variant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bodyLg'
  | 'body'
  | 'bodySm'
  | 'label'
  | 'caption'
  | 'button'
  | 'overline';

export const typography: Record<Variant, TextStyle> = {
  display: { fontFamily: fontFamily.bold, fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 },
  h1: { fontFamily: fontFamily.bold, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.3 },
  h2: { fontFamily: fontFamily.semibold, fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.2 },
  h3: { fontFamily: fontFamily.semibold, fontSize: 18, lineHeight: 24, fontWeight: '600' },
  bodyLg: { fontFamily: fontFamily.regular, fontSize: 17, lineHeight: 25, fontWeight: '400' },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodySm: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  label: { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 18, fontWeight: '500' },
  caption: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 16, fontWeight: '400' },
  button: { fontFamily: fontFamily.semibold, fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: 0.2 },
  overline: { fontFamily: fontFamily.medium, fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
};

export type TypographyVariant = Variant;
