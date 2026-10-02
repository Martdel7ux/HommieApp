import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme';
import { haptics } from '@/services/haptics';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  leftIcon,
  style,
  accessibilityHint,
  onPress,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isDisabled = disabled || loading;
  // fullWidth="stretch to fill the parent" is the right call on a phone (or
  // phone-width web) screen, but on a desktop browser a "full width" button
  // would stretch to whatever wide column it sits in and look oversized —
  // real desktop sites size buttons to their label instead. Only this,
  // narrower-than-the-mobile-default behavior changes; native is untouched.
  const isDesktopWeb = Platform.OS === 'web' && windowWidth >= 700;

  const heights: Record<Size, number> = { sm: 38, md: 48, lg: 54 };

  const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: theme.colors.primary, fg: theme.colors.onPrimary },
    secondary: { bg: theme.colors.primarySubtle, fg: theme.colors.primaryPressed },
    ghost: { bg: 'transparent', fg: theme.colors.primary },
    danger: { bg: theme.colors.danger, fg: theme.colors.textInverse },
  };
  const p = palette[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityHint={accessibilityHint}
      disabled={isDisabled}
      hitSlop={6}
      style={({ pressed }) => [
        {
          height: heights[size],
          borderRadius: theme.radius.pill,
          backgroundColor: p.bg,
          borderWidth: p.border ? 1 : 0,
          borderColor: p.border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.xl,
          alignSelf: fullWidth ? (isDesktopWeb ? 'center' : 'stretch') : 'flex-start',
          width: fullWidth && isDesktopWeb ? '100%' : undefined,
          maxWidth: fullWidth && isDesktopWeb ? 360 : undefined,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
      onPress={(e) => {
        haptics.tap();
        onPress?.(e);
      }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <>
          {leftIcon ? <View>{leftIcon}</View> : null}
          <Text variant="button" color={p.fg}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}
