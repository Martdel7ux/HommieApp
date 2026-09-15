import { useState } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useTheme } from '@/theme';
import { Text } from './Text';

export interface DateFieldProps {
  label?: string;
  placeholder?: string;
  /** ISO date string ('YYYY-MM-DD'), or empty/undefined for unset. */
  value?: string | null;
  onChange: (value: string) => void;
  error?: string;
  minimumDate?: Date;
}

/** A tap-to-open native scroll/wheel date picker, styled like TextField. */
export function DateField({ label, placeholder = 'Select date', value, onChange, error, minimumDate }: DateFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [staged, setStaged] = useState<Date>(() => (value ? parseISO(value) : new Date()));

  const openPicker = () => {
    setStaged(value ? parseISO(value) : new Date());
    setOpen(true);
  };

  const confirm = (date: Date) => {
    onChange(format(date, 'yyyy-MM-dd'));
    setOpen(false);
  };

  const borderColor = error ? theme.colors.danger : theme.colors.border;

  return (
    <View style={{ gap: theme.spacing.xs }}>
      {label ? (
        <Text variant="label" color={theme.colors.textSecondary}>
          {label}
        </Text>
      ) : null}
      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value ? format(parseISO(value), 'MMM d, yyyy') : placeholder }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderWidth: 1,
          borderColor,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.spacing.lg,
          minHeight: 48,
        }}
      >
        <Text color={value ? theme.colors.textPrimary : theme.colors.textTertiary}>
          {value ? format(parseISO(value), 'MMM d, yyyy') : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
      </Pressable>
      {error ? (
        <Text variant="caption" color={theme.colors.danger}>
          {error}
        </Text>
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
          <Pressable style={{ flex: 1, backgroundColor: theme.colors.overlay }} onPress={() => setOpen(false)} />
          <SafeAreaView
            edges={['bottom']}
            style={{
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: theme.radius.xl,
              borderTopRightRadius: theme.radius.xl,
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
              <Pressable onPress={() => setOpen(false)}>
                <Text color={theme.colors.textSecondary}>Cancel</Text>
              </Pressable>
              <Text variant="h3">{label ?? 'Select date'}</Text>
              <Pressable onPress={() => confirm(staged)}>
                <Text color={theme.colors.primary} style={{ fontWeight: '600' }}>
                  Done
                </Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={staged}
              mode="date"
              display="spinner"
              minimumDate={minimumDate}
              onChange={(_e, date) => date && setStaged(date)}
              style={{ height: 216 }}
            />
          </SafeAreaView>
        </Modal>
      ) : open ? (
        <DateTimePicker
          value={staged}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          onChange={(e, date) => {
            setOpen(false);
            if (e.type === 'set' && date) confirm(date);
          }}
        />
      ) : null}
    </View>
  );
}
