import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, SegmentedControl } from '@/components/ui';
import { useTheme, useThemeMode } from '@/theme';
import type { ThemePreference } from '@/theme';

const OPTIONS: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

export default function Appearance() {
  const theme = useTheme();
  const { preference, setPreference } = useThemeMode();

  return (
    <Screen keyboardAvoiding>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Appearance',
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerTintColor: theme.colors.textPrimary,
        }}
      />
      <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.md }}>
        <Text variant="bodySm" muted>
          Choose how Hommie looks. &ldquo;System&rdquo; follows your device&rsquo;s own light/dark setting.
        </Text>
        <SegmentedControl options={OPTIONS} value={preference} onChange={setPreference} />
      </View>
    </Screen>
  );
}
