import { View } from 'react-native';
import { Screen, Text, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Phase-1 placeholder. Each of these screens is replaced by its real
 * implementation in Phase 2–3 (see README build phases).
 */
export function ComingSoon({
  title,
  subtitle,
  icon,
  phase,
}: {
  title: string;
  subtitle: string;
  icon?: React.ComponentProps<typeof EmptyState>['icon'];
  phase: string;
}) {
  const theme = useTheme();
  return (
    <Screen>
      <View style={{ flex: 1 }}>
        <Text variant="h1" style={{ marginTop: theme.spacing.sm }}>
          {title}
        </Text>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState icon={icon ?? 'construct-outline'} title="Coming very soon" message={subtitle} />
          <Text variant="caption" muted align="center">
            Planned for {phase}
          </Text>
        </View>
      </View>
    </Screen>
  );
}
