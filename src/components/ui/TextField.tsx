import React, { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleProp,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from './Text';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  isPassword?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, isPassword, containerStyle, style, onFocus, onBlur, ...rest },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!isPassword);

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.focusRing
      : theme.colors.border;

  return (
    <View style={[{ gap: theme.spacing.xs }, containerStyle]}>
      {label ? (
        <Text variant="label" color={theme.colors.textSecondary}>
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        <TextInput
          ref={ref}
          placeholderTextColor={theme.colors.textTertiary}
          secureTextEntry={hidden}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            {
              flex: 1,
              paddingVertical: theme.spacing.md,
              fontSize: 15,
              color: theme.colors.textPrimary,
              minHeight: 48,
            },
            style,
          ]}
          {...rest}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color={theme.colors.danger}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color={theme.colors.textTertiary}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
