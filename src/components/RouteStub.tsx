import { Stack } from 'expo-router';
import { Screen, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme';
import type { Ionicons } from '@expo/vector-icons';

/**
 * Placeholder for a route that is planned but not built yet. Gives a real native
 * header (with back) so navigation into it from Home / cards works cleanly.
 * Replace each of these with the real screen as we build them.
 */
export function RouteStub({
  title,
  icon,
  message,
}: {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  message: string;
}) {
  const theme = useTheme();
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title,
          headerStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerTintColor: theme.colors.textPrimary,
        }}
      />
      <Screen>
        <EmptyState icon={icon ?? 'construct-outline'} title="Coming soon" message={message} />
      </Screen>
    </>
  );
}
