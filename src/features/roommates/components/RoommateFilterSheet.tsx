import React, { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text, Button, TextField, ChipGroup, Select } from '@/components/ui';
import { qk } from '@/lib/queryClient';
import { CYPRUS_AREAS } from '@/config/constants';
import { profileApi } from '@/features/profile/api';
import type { RoommateFilters, RoommateSort } from '../types';

const SORT_OPTIONS: { value: RoommateSort; label: string }[] = [
  { value: 'match', label: 'Best match' },
  { value: 'newest', label: 'Newest' },
  { value: 'budget_low', label: 'Lowest budget' },
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

export function RoommateFilterSheet({
  visible,
  filters,
  onClose,
  onApply,
}: {
  visible: boolean;
  filters: RoommateFilters;
  onClose: () => void;
  onApply: (next: RoommateFilters) => void;
}) {
  const theme = useTheme();
  const [draft, setDraft] = useState<RoommateFilters>(filters);

  const universities = useQuery({
    queryKey: qk.universities,
    queryFn: () => profileApi.getUniversities(),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const set = <K extends keyof RoommateFilters>(k: K, v: RoommateFilters[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

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
          maxHeight: '85%',
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
          <Pressable onPress={() => setDraft({ sort: filters.sort })} hitSlop={8}>
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
              value={draft.sort ?? 'match'}
              onChange={(v) => set('sort', v as RoommateSort)}
            />
          </Row>

          <Row label="University">
            <Select
              placeholder="Any university"
              options={[
                { value: '', label: 'Any university' },
                ...(universities.data ?? []).map((u) => ({
                  value: u.id,
                  label: u.short_name ?? u.name,
                })),
              ]}
              value={draft.universityId ?? ''}
              onChange={(v) => set('universityId', v || undefined)}
            />
          </Row>

          <Row label="My max budget (€)">
            <TextField
              placeholder="e.g. 500"
              keyboardType="number-pad"
              value={draft.budgetMax != null ? String(draft.budgetMax) : ''}
              onChangeText={(t) =>
                set('budgetMax', t ? Number(t.replace(/[^0-9]/g, '')) || undefined : undefined)
              }
            />
          </Row>

          <Row label="Preferred area">
            <Select
              placeholder="Any area"
              options={[
                { value: '', label: 'Any area' },
                ...CYPRUS_AREAS.map((a) => ({ value: a, label: a })),
              ]}
              value={draft.area ?? ''}
              onChange={(v) => set('area', v || undefined)}
            />
          </Row>
        </ScrollView>

        <View style={{ padding: theme.spacing.lg, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
          <Button
            title="Show matches"
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
