import React, { useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from './Text';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

export function Select({
  label,
  placeholder = 'Select…',
  options,
  value,
  onChange,
  error,
  filled = false,
}: {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  error?: string;
  /** Borderless pale-fill style (matches the "Create listing" form). */
  filled?: boolean;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <View style={{ gap: theme.spacing.xs }}>
      {label ? (
        <Text variant="label" color={theme.colors.textSecondary}>
          {label}
        </Text>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: current?.label ?? placeholder }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: filled ? 0 : 1,
          borderColor: error ? theme.colors.danger : theme.colors.border,
          borderRadius: filled ? theme.radius.lg : theme.radius.md,
          backgroundColor: filled ? theme.colors.surfaceAlt : theme.colors.surface,
          paddingHorizontal: theme.spacing.lg,
          minHeight: filled ? 52 : 48,
        }}
      >
        <Text color={current ? theme.colors.textPrimary : theme.colors.textTertiary}>
          {current?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
      </Pressable>
      {error ? (
        <Text variant="caption" color={theme.colors.danger}>
          {error}
        </Text>
      ) : null}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)} transparent>
        <Pressable style={{ flex: 1, backgroundColor: theme.colors.overlay }} onPress={() => setOpen(false)} />
        <SafeAreaView
          edges={['bottom']}
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.radius.xl,
            borderTopRightRadius: theme.radius.xl,
            maxHeight: '70%',
          }}
        >
          <View style={{ padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
            <Text variant="h3">{label ?? 'Select'}</Text>
          </View>
          <FlatList
            data={options}
            keyExtractor={(o) => o.value}
            renderItem={({ item }) => {
              const selected = item.value === value;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: theme.spacing.lg,
                    paddingVertical: theme.spacing.lg,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text color={selected ? theme.colors.primary : theme.colors.textPrimary}>{item.label}</Text>
                    {item.sublabel ? (
                      <Text variant="caption" muted>
                        {item.sublabel}
                      </Text>
                    ) : null}
                  </View>
                  {selected ? <Ionicons name="checkmark" size={20} color={theme.colors.primary} /> : null}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}
