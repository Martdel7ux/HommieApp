import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

/** A circular white control that floats legibly over a photo. */
export function OverlayIconButton({
  icon,
  onPress,
  label,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label: string;
  tint?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.sm,
      }}
    >
      <Ionicons name={icon} size={20} color={tint ?? theme.colors.textPrimary} />
    </Pressable>
  );
}

/**
 * Back button (left) + optional controls (right), floating over a full-bleed
 * hero image — no opaque header bar. Place it inside the image's wrapper `View`.
 */
export function OverlayHeader({ onBack, right }: { onBack: () => void; right?: ReactNode }) {
  const theme = useTheme();
  return (
    <SafeAreaView
      edges={['top']}
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, top: 0 }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.layout.screenPadding,
          paddingTop: theme.spacing.sm,
        }}
      >
        <OverlayIconButton icon="chevron-back" onPress={onBack} label="Go back" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>{right}</View>
      </View>
    </SafeAreaView>
  );
}
