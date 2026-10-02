import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Button, Screen, Text } from '@/components/ui';
import type { ListingDraft } from '../types';

/**
 * Web stub. Creating/editing a listing (5-step wizard with a map-based
 * location picker) is explicitly out of scope for the web app — see the
 * web-app plan. A landlord on web is pointed at the app instead, same as
 * `app/landlord-web.tsx` does for the rest of the landlord experience.
 *
 * This file exists only so Metro's `.web.tsx` platform resolution keeps
 * `react-native-maps` out of the web bundle's module graph entirely — the
 * real ListingWizard.tsx imports it statically, and that library calls
 * codegenNativeComponent() at module-evaluation time (no web
 * implementation), which crashes the whole app on load regardless of
 * whether this screen is ever actually visited (Expo Router's web output
 * bundles the full app/ route tree up front).
 */
export function ListingWizard({
  onExit,
}: {
  mode: 'create' | 'edit';
  initialDraft: ListingDraft;
  listingId?: string;
  onDone: (id: string) => void;
  onExit: () => void;
}) {
  const theme = useTheme();
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg, padding: theme.layout.screenPadding }}>
        <Text variant="h2" align="center">
          Creating listings isn&apos;t available on web yet
        </Text>
        <Text muted align="center">
          Download the Hommie app to create or edit a listing.
        </Text>
        <Button title="Back" variant="secondary" onPress={onExit} />
      </View>
    </Screen>
  );
}
