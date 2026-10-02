import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import type { AccommodationCard } from '../types';

/**
 * Web stub — react-native-maps can't even be *imported* on web: its native
 * component spec files (Marker, Polygon, UrlTile, …) call
 * codegenNativeComponent() at module-evaluation time, which crashes the
 * whole app before any component ever renders. react-native-web has no
 * implementation of that function.
 *
 * This never actually renders in practice — app/accommodation/index.tsx
 * hides the list/map toggle entirely on web and never mounts <ListingMap>
 * — but the file still needs to exist with the same export signature so
 * Metro's .web.tsx platform resolution has something to pick instead of
 * ListingMap.tsx, keeping react-native-maps out of the web bundle's module
 * graph altogether.
 */
export function ListingMap({
  listings: _listings,
  savedSet: _savedSet,
  onToggleSave: _onToggleSave,
  onOpen: _onOpen,
}: {
  listings: AccommodationCard[];
  savedSet: Set<string>;
  onToggleSave: (id: string, next: boolean) => void;
  onOpen: (id: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl }}>
      <Text muted align="center">
        Map view isn&apos;t available on web yet — use List view to browse listings.
      </Text>
    </View>
  );
}
