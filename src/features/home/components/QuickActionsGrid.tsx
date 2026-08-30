import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';

type Variant = 'primary' | 'tint' | 'violet' | 'outline';

export interface QuickAction {
  key: string;
  label: string;
  /** Render the icon so each tile can pull from any icon set (Ionicons, MDI…). */
  icon: (props: { size: number; color: string }) => React.ReactNode;
  variant: Variant;
  onPress: () => void;
}

function useVariantStyle(variant: Variant) {
  const t = useTheme();
  switch (variant) {
    case 'primary':
      return { bg: t.colors.primaryBold, fg: t.colors.onPrimary, iconBg: 'rgba(255,255,255,0.18)', border: 'transparent' };
    case 'tint':
      return { bg: t.colors.primarySubtle, fg: t.colors.primarySubtleInk, iconBg: t.colors.surface, border: 'transparent' };
    case 'violet':
      return { bg: t.colors.tileEventsBg, fg: t.colors.tileEventsInk, iconBg: t.colors.surface, border: 'transparent' };
    case 'outline':
    default:
      return { bg: t.colors.surface, fg: t.colors.textPrimary, iconBg: t.colors.surfaceAlt, border: t.colors.border };
  }
}

function Tile({ action }: { action: QuickAction }) {
  const t = useTheme();
  const s = useVariantStyle(action.variant);
  const iconColor = action.variant === 'primary' ? t.colors.onPrimary : s.fg;
  return (
    <Pressable
      onPress={action.onPress}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      style={({ pressed }) => ({
        width: '48%',
        flexGrow: 1,
        minHeight: 116,
        borderRadius: 18,
        padding: t.spacing.lg,
        justifyContent: 'space-between',
        backgroundColor: s.bg,
        borderWidth: s.border === 'transparent' ? 0 : 1,
        borderColor: s.border,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: s.iconBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {action.icon({ size: 20, color: iconColor })}
      </View>
      <Text style={{ fontSize: 16, fontWeight: '700' }} color={s.fg}>
        {action.label}
      </Text>
    </Pressable>
  );
}

export function QuickActionsGrid({ actions }: { actions: QuickAction[] }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.md }}>
      {actions.map((a) => (
        <Tile key={a.key} action={a} />
      ))}
    </View>
  );
}
