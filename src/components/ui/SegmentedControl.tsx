import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from './Text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.surfaceSunken,
        borderRadius: theme.radius.pill,
        padding: 3,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: 7,
              borderRadius: theme.radius.pill,
              backgroundColor: active ? theme.colors.surface : 'transparent',
              ...(active ? theme.shadows.sm : {}),
            }}
          >
            {o.icon ? (
              <Ionicons
                name={o.icon}
                size={15}
                color={active ? theme.colors.primary : theme.colors.textSecondary}
              />
            ) : null}
            <Text
              variant="label"
              color={active ? theme.colors.primary : theme.colors.textSecondary}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
