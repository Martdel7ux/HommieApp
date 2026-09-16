import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import { propertyTypeLabels } from '@/config/labels';
import type { AccommodationFilters } from '../types';

export function SearchBar({
  value,
  onChangeText,
  onOpenFilters,
  activeFilterCount,
}: {
  value: string;
  onChangeText: (t: string) => void;
  onOpenFilters: () => void;
  activeFilterCount: number;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.pill,
          paddingHorizontal: theme.spacing.lg,
          height: 46,
        }}
      >
        <Ionicons name="search" size={18} color={theme.colors.textTertiary} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Search by area or university..."
          placeholderTextColor={theme.colors.textTertiary}
          returnKeyType="search"
          style={{ flex: 1, fontSize: 14, color: theme.colors.textPrimary }}
        />
        {value ? (
          <Pressable onPress={() => onChangeText('')} hitSlop={8} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={16} color={theme.colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      <Pressable
        onPress={onOpenFilters}
        accessibilityRole="button"
        accessibilityLabel={`Filters${activeFilterCount ? `, ${activeFilterCount} active` : ''}`}
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: theme.colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="options-outline" size={20} color={theme.colors.onPrimary} />
        {activeFilterCount > 0 ? (
          <View
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              minWidth: 18,
              height: 18,
              paddingHorizontal: 4,
              borderRadius: 9,
              backgroundColor: theme.colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: theme.colors.background,
            }}
          >
            <Text variant="overline" color={theme.colors.textInverse}>
              {activeFilterCount}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

type ChipDef = { key: string; label: string; onRemove?: () => void };

function activeChips(f: AccommodationFilters, patch: (p: AccommodationFilters) => void): ChipDef[] {
  const chips: ChipDef[] = [];
  if (f.area) chips.push({ key: 'area', label: `Area: ${f.area}`, onRemove: () => patch({ area: undefined }) });
  if (f.rentMin != null || f.rentMax != null) {
    const label =
      f.rentMin != null && f.rentMax != null
        ? `€${f.rentMin} to €${f.rentMax}`
        : f.rentMax != null
          ? `Up to €${f.rentMax}`
          : `From €${f.rentMin}`;
    chips.push({ key: 'rent', label, onRemove: () => patch({ rentMin: undefined, rentMax: undefined }) });
  }
  if (f.propertyTypes?.length) {
    chips.push({
      key: 'type',
      label: f.propertyTypes.map((t) => propertyTypeLabels[t]).join(', '),
      onRemove: () => patch({ propertyTypes: undefined }),
    });
  }
  if (f.minBedrooms) chips.push({ key: 'beds', label: `${f.minBedrooms}+ beds`, onRemove: () => patch({ minBedrooms: undefined }) });
  if (f.studentAudience) {
    chips.push({
      key: 'audience',
      label: f.studentAudience === 'erasmus' ? 'Erasmus' : 'Full-time',
      onRemove: () => patch({ studentAudience: undefined }),
    });
  }
  if (f.furnished) chips.push({ key: 'furn', label: 'Furnished', onRemove: () => patch({ furnished: undefined }) });
  if (f.billsIncluded) chips.push({ key: 'bills', label: 'Bills incl.', onRemove: () => patch({ billsIncluded: undefined }) });
  if (f.roommateSuitable) chips.push({ key: 'share', label: 'For sharing', onRemove: () => patch({ roommateSuitable: undefined }) });
  if (f.availableFrom) chips.push({ key: 'avail', label: 'Available now', onRemove: () => patch({ availableFrom: undefined }) });
  if (f.sort && f.sort !== 'relevance') {
    const m = { newest: 'Newest', rent_asc: 'Lowest rent', rent_desc: 'Highest rent' } as const;
    chips.push({ key: 'sort', label: m[f.sort], onRemove: () => patch({ sort: 'relevance' }) });
  }
  return chips;
}

export function FilterChipsRow({
  filters,
  onPatch,
  onOpenFilters,
}: {
  filters: AccommodationFilters;
  onPatch: (p: AccommodationFilters) => void;
  onOpenFilters: () => void;
}) {
  const theme = useTheme();
  const chips = activeChips(filters, onPatch);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -theme.layout.screenPadding }}
      contentContainerStyle={{ paddingHorizontal: theme.layout.screenPadding, gap: theme.spacing.sm }}
    >
      <Pressable
        onPress={onOpenFilters}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.pill,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: 7,
        }}
      >
        <Ionicons name="options-outline" size={13} color={theme.colors.textSecondary} />
        <Text variant="label" color={theme.colors.textSecondary}>
          {chips.length ? 'Edit' : 'Filters'}
        </Text>
      </Pressable>

      {chips.map((c) => (
        <Pressable
          key={c.key}
          onPress={c.onRemove}
          accessibilityRole="button"
          accessibilityLabel={`Remove filter ${c.label}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radius.pill,
            paddingLeft: theme.spacing.md,
            paddingRight: theme.spacing.sm,
            paddingVertical: 7,
          }}
        >
          <Text variant="label" color={theme.colors.onPrimary}>
            {c.label}
          </Text>
          <Ionicons name="close" size={13} color={theme.colors.onPrimary} />
        </Pressable>
      ))}
    </ScrollView>
  );
}
