import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import MapView, { Marker, type MapViewProps } from 'react-native-maps';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import { coverImage, locationLabel } from '../api';
import type { AccommodationCard } from '../types';

/** Nicosia — used when a listing has no coordinates yet. */
const FALLBACK = { latitude: 35.1676, longitude: 33.3736, latitudeDelta: 0.09, longitudeDelta: 0.09 };

type Pinned = AccommodationCard & { approx_lat: number; approx_lng: number };

export function ListingMap({
  listings,
  savedSet,
  onToggleSave,
  onOpen,
}: {
  listings: AccommodationCard[];
  savedSet: Set<string>;
  onToggleSave: (id: string, next: boolean) => void;
  onOpen: (id: string) => void;
}) {
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pinned = useMemo<Pinned[]>(
    () =>
      listings.filter(
        (l): l is Pinned => typeof l.approx_lat === 'number' && typeof l.approx_lng === 'number',
      ),
    [listings],
  );

  const selected = pinned.find((l) => l.id === selectedId) ?? null;

  const initialRegion = useMemo<MapViewProps['initialRegion']>(() => {
    if (!pinned.length) return FALLBACK;
    const lats = pinned.map((l) => l.approx_lat);
    const lngs = pinned.map((l) => l.approx_lng);
    const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const midLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: Math.max(0.03, (Math.max(...lats) - Math.min(...lats)) * 1.6),
      longitudeDelta: Math.max(0.03, (Math.max(...lngs) - Math.min(...lngs)) * 1.6),
    };
  }, [pinned]);

  useEffect(() => {
    if (pinned.length < 2) return;
    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(
        pinned.map((l) => ({ latitude: l.approx_lat, longitude: l.approx_lng })),
        { edgePadding: { top: 80, right: 60, bottom: 220, left: 60 }, animated: true },
      );
    }, 350);
    return () => clearTimeout(t);
  }, [pinned]);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onPress={() => setSelectedId(null)}
      >
        {pinned.map((l) => {
          const active = l.id === selectedId;
          return (
            <Marker
              key={l.id}
              coordinate={{ latitude: l.approx_lat, longitude: l.approx_lng }}
              onPress={() => setSelectedId(l.id)}
              tracksViewChanges={Platform.OS === 'ios' ? active : true}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View style={{ alignItems: 'center' }}>
                <View
                  style={{
                    backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                    borderWidth: 1,
                    borderRadius: theme.radius.pill,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    ...theme.shadows.sm,
                  }}
                >
                  <Text
                    style={{ fontSize: 13, fontWeight: '800' }}
                    color={active ? theme.colors.onPrimary : theme.colors.primary}
                  >
                    €{l.rent_month}
                  </Text>
                </View>
                <View
                  style={{
                    width: 0,
                    height: 0,
                    borderLeftWidth: 5,
                    borderRightWidth: 5,
                    borderTopWidth: 6,
                    borderLeftColor: 'transparent',
                    borderRightColor: 'transparent',
                    borderTopColor: active ? theme.colors.primary : theme.colors.surface,
                    marginTop: -1,
                  }}
                />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {pinned.length === 0 ? (
        <View
          style={{
            position: 'absolute',
            top: theme.spacing.md,
            alignSelf: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.pill,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.sm,
            ...theme.shadows.md,
          }}
        >
          <Text variant="bodySm" muted>
            No mapped listings match your filters
          </Text>
        </View>
      ) : null}

      {selected ? (
        <View
          style={{
            position: 'absolute',
            left: theme.spacing.lg,
            right: theme.spacing.lg,
            bottom: theme.spacing.xl,
          }}
        >
          <Pressable
            onPress={() => onOpen(selected.id)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${selected.title}`}
            style={{
              flexDirection: 'row',
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.xl,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: theme.colors.border,
              ...theme.shadows.lg,
            }}
          >
            <Image
              source={{ uri: coverImage(selected) }}
              style={{ width: 104, height: 104, backgroundColor: theme.colors.primarySubtle }}
              contentFit="cover"
              transition={150}
            />
            <View style={{ flex: 1, padding: theme.spacing.md, gap: 3 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm }}>
                <Text variant="h3" numberOfLines={1} style={{ flex: 1, fontSize: 14.5 }}>
                  {selected.title}
                </Text>
                <Pressable
                  onPress={() => onToggleSave(selected.id, !savedSet.has(selected.id))}
                  hitSlop={8}
                  accessibilityLabel={savedSet.has(selected.id) ? 'Remove from saved' : 'Save listing'}
                >
                  <Ionicons
                    name={savedSet.has(selected.id) ? 'heart' : 'heart-outline'}
                    size={18}
                    color={savedSet.has(selected.id) ? theme.colors.primary : theme.colors.textTertiary}
                  />
                </Pressable>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '800' }} color={theme.colors.primary}>
                €{selected.rent_month}
                <Text variant="caption" muted>
                  {' '}
                  /mo
                </Text>
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="location-outline" size={12} color={theme.colors.textTertiary} />
                <Text variant="caption" muted numberOfLines={1}>
                  {locationLabel(selected)}
                </Text>
              </View>
            </View>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
