import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/theme';
import { haptics } from '@/services/haptics';
import { Text } from './Text';

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={{
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        backgroundColor: selected ? theme.colors.primarySubtle : theme.colors.surface,
      }}
    >
      <Text variant="label" color={selected ? theme.colors.primaryPressed : theme.colors.textSecondary}>
        {label}
      </Text>
    </Pressable>
  );
}

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  multiple = false,
}: {
  options: ChipOption<T>[];
  value: T | T[] | null;
  onChange: (value: T | T[]) => void;
  multiple?: boolean;
}) {
  const theme = useTheme();
  const selectedList = Array.isArray(value) ? value : value ? [value] : [];

  const toggle = (v: T) => {
    haptics.select();
    if (multiple) {
      const set = new Set(selectedList);
      if (set.has(v)) set.delete(v);
      else set.add(v);
      onChange(Array.from(set));
    } else {
      onChange(v);
    }
  };

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={selectedList.includes(o.value)} onPress={() => toggle(o.value)} />
      ))}
    </View>
  );
}
