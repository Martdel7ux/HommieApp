import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { appStorage, STORAGE_KEYS } from '@/lib/storage';
import { theme as lightTheme, darkTheme } from './theme';
import type { Theme } from './theme';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  isDark: false,
  preference: 'system',
  setPreference: () => undefined,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    appStorage.getItem(STORAGE_KEYS.themePreference).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
    });
  }, []);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    appStorage.setItem(STORAGE_KEYS.themePreference, next).catch(() => undefined);
  };

  const isDark = preference === 'system' ? systemScheme === 'dark' : preference === 'dark';

  const value = useMemo<ThemeContextValue>(
    () => ({ theme: isDark ? darkTheme : lightTheme, isDark, preference, setPreference }),
    [isDark, preference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

export function useThemeMode(): Pick<ThemeContextValue, 'isDark' | 'preference' | 'setPreference'> {
  const { isDark, preference, setPreference } = useContext(ThemeContext);
  return { isDark, preference, setPreference };
}
