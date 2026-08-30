import { lightColors, darkColors, AppColors } from './colors';
import { spacing, radius, layout } from './spacing';
import { typography, fontFamily } from './typography';
import { shadows } from './shadows';

export interface Theme {
  colors: AppColors;
  spacing: typeof spacing;
  radius: typeof radius;
  layout: typeof layout;
  typography: typeof typography;
  fontFamily: typeof fontFamily;
  shadows: typeof shadows;
}

export const theme: Theme = {
  colors: lightColors,
  spacing,
  radius,
  layout,
  typography,
  fontFamily,
  shadows,
};

export const darkTheme: Theme = { ...theme, colors: darkColors };

export type { AppColors };
