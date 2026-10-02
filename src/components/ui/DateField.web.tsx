import { format } from 'date-fns';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

// Duplicated from DateField.tsx rather than imported from it: a bare
// `from './DateField'` specifier inside this .web.tsx file would itself
// resolve to this same file under Metro's platform-extension rules on web
// (self-referential import), so the two files can't share the type via a
// direct import. Keep these in sync if the props ever change.
export interface DateFieldProps {
  label?: string;
  placeholder?: string;
  /** ISO date string ('YYYY-MM-DD'), or empty/undefined for unset. */
  value?: string | null;
  onChange: (value: string) => void;
  error?: string;
  minimumDate?: Date;
}

/**
 * Web variant of DateField — @react-native-community/datetimepicker has no
 * web implementation at all (confirmed: no .web.ts in the package), so this
 * uses the browser's native <input type="date">. Same props/behavior as the
 * native DateField (ISO 'yyyy-MM-dd' in and out); Metro picks this file
 * automatically on web via the .web.tsx platform extension, so no consumer
 * (onboarding, accommodation filters) needs to change.
 */
export function DateField({ label, placeholder = 'Select date', value, onChange, error, minimumDate }: DateFieldProps) {
  const theme = useTheme();
  const borderColor = error ? theme.colors.danger : theme.colors.border;

  return (
    <View style={{ gap: theme.spacing.xs }}>
      {label ? (
        <Text variant="label" color={theme.colors.textSecondary}>
          {label}
        </Text>
      ) : null}
      {/* Raw DOM element — react-native-web renders this directly via
          react-dom on web, same escape hatch used for anything with no RN
          equivalent. Styled inline to match TextField/DateField's box. */}
      <input
        type="date"
        value={value ?? ''}
        min={minimumDate ? format(minimumDate, 'yyyy-MM-dd') : undefined}
        placeholder={placeholder}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
        }}
        style={{
          fontFamily: 'inherit',
          fontSize: 15,
          color: value ? theme.colors.textPrimary : theme.colors.textTertiary,
          border: `1px solid ${borderColor}`,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surface,
          paddingLeft: theme.spacing.lg,
          paddingRight: theme.spacing.lg,
          minHeight: 48,
          width: '100%',
          boxSizing: 'border-box',
          outline: 'none',
        }}
      />
      {error ? (
        <Text variant="caption" color={theme.colors.danger}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
