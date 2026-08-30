import { theme, Theme } from './theme';

/**
 * Access the active theme. V1 is light-only, so this is a constant hook today;
 * it exists so screens never import raw token modules and a future dark-mode
 * toggle is a one-line change here.
 */
export function useTheme(): Theme {
  return theme;
}
