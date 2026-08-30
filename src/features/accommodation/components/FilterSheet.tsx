import React, { useState } from 'react';
import { Modal, Pressable, Switch, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text, Button, TextField, ChipGroup, Select } from '@/components/ui';
import { PROPERTY_TYPES, CYPRUS_AREAS } from '@/config/constants';
import { propertyTypeLabels, enumOptions } from '@/config/labels';
import type { AccommodationFilters, AccommodationSort } from '../types';

const SORT_OPTIONS: { value: AccommodationSort; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest' },
  { value: 'rent_asc', label: 'Lowest rent' },
  { value: 'rent_desc', label: 'Highest rent' },
];

const BEDROOM_OPTIONS = [
  { value: '0', label: 'Any' },
  { value: '1', label: '1+' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="label" color={theme.colors.textSecondary}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}
    >
      <Text>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }}
        thumbColor={theme.colors.surface}
      />
    </Pressable>
  );
}

export function FilterSheet({
  visible,
  filters,
  onClose,
  onApply,
}: {
  visible: boolean;
  filters: AccommodationFilters;
  onClose: () => void;
  onApply: (next: AccommodationFilters) => void;
}) {
  const theme = useTheme();
  const [draft, setDraft] = useState<AccommodationFilters>(filters);

  const set = <K extends keyof AccommodationFilters>(k: K, v: AccommodationFilters[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const reset = () => {
    // keep the free-text search; clear everything else
    setDraft({ query: filters.query });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      onShow={() => setDraft(filters)}
    >
      <Pressable style={{ flex: 1, backgroundColor: theme.colors.overlay }} onPress={onClose} />
      <SafeAreaView
        edges={['bottom']}
        style={{
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: theme.radius.xl,
          borderTopRightRadius: theme.radius.xl,
          maxHeight: '88%',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: theme.spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <Text variant="h3">Filters</Text>
          <Pressable onPress={reset} hitSlop={8}>
            <Text variant="label" color={theme.colors.primary}>
              Reset
            </Text>
          </Pressable>
          <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
            <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.xl }}>
          <Row label="Sort by">
            <ChipGroup
              options={SORT_OPTIONS}
              value={draft.sort ?? 'relevance'}
              onChange={(v) => set('sort', v as AccommodationSort)}
            />
          </Row>

          <Row label="Monthly rent (€)">
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <TextField
                containerStyle={{ flex: 1 }}
                placeholder="Min"
                keyboardType="number-pad"
                value={draft.rentMin != null ? String(draft.rentMin) : ''}
                onChangeText={(t) => set('rentMin', t ? Number(t.replace(/[^0-9]/g, '')) : undefined)}
              />
              <TextField
                containerStyle={{ flex: 1 }}
                placeholder="Max"
                keyboardType="number-pad"
                value={draft.rentMax != null ? String(draft.rentMax) : ''}
                onChangeText={(t) => set('rentMax', t ? Number(t.replace(/[^0-9]/g, '')) : undefined)}
              />
            </View>
          </Row>

          <Row label="Area">
            <Select
              placeholder="Any area"
              options={[{ value: '', label: 'Any area' }, ...CYPRUS_AREAS.map((a) => ({ value: a, label: a }))]}
              value={draft.area ?? ''}
              onChange={(v) => set('area', v || undefined)}
            />
          </Row>

          <Row label="Property type">
            <ChipGroup
              multiple
              options={enumOptions(propertyTypeLabels)}
              value={draft.propertyTypes ?? []}
              onChange={(v) => set('propertyTypes', (v as typeof PROPERTY_TYPES[number][]).length ? (v as never) : undefined)}
            />
          </Row>

          <Row label="Bedrooms">
            <ChipGroup
              options={BEDROOM_OPTIONS}
              value={String(draft.minBedrooms ?? 0)}
              onChange={(v) => set('minBedrooms', Number(v) || undefined)}
            />
          </Row>

          <View style={{ gap: theme.spacing.sm }}>
            <ToggleRow label="Furnished" value={!!draft.furnished} onChange={(v) => set('furnished', v || undefined)} />
            <ToggleRow
              label="Bills included"
              value={!!draft.billsIncluded}
              onChange={(v) => set('billsIncluded', v || undefined)}
            />
            <ToggleRow
              label="Good for sharing"
              value={!!draft.roommateSuitable}
              onChange={(v) => set('roommateSuitable', v || undefined)}
            />
            <ToggleRow
              label="Available now"
              value={!!draft.availableFrom}
              onChange={(v) => set('availableFrom', v ? new Date().toISOString().slice(0, 10) : undefined)}
            />
          </View>
        </ScrollView>

        <View style={{ padding: theme.spacing.lg, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
          <Button
            title="Show results"
            onPress={() => {
              onApply(draft);
              onClose();
            }}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
