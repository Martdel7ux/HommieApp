import { Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Text } from './Text';

export interface ActionSheetOption {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  message?: string;
  options: ActionSheetOption[];
  onClose: () => void;
}

/**
 * Web replacement for Alert.alert's multi-option menus (the conversation's
 * "View profile / Report user / Block user" menu, and the report-reasons
 * picker) — react-native-web's Alert shim only supports a 2-button confirm
 * via window.confirm, not an arbitrary option list, so those two menus in
 * app/messages/[id].tsx render unusably on web. This is the same
 * Modal-based bottom-sheet pattern already used by Select.tsx (confirmed
 * web-safe there). Native keeps using Alert.alert unchanged — this
 * component is only reached from a Platform.OS === 'web' branch.
 */
export function ActionSheet({ visible, title, message, options, onClose }: ActionSheetProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: theme.colors.overlay }} onPress={onClose} />
      <SafeAreaView
        edges={['bottom']}
        style={{
          backgroundColor: theme.colors.surface,
          borderTopLeftRadius: theme.radius.xl,
          borderTopRightRadius: theme.radius.xl,
        }}
      >
        {title ? (
          <View style={{ padding: theme.spacing.lg, paddingBottom: message ? 0 : theme.spacing.lg, gap: 4 }}>
            <Text variant="h3">{title}</Text>
            {message ? (
              <Text muted style={{ paddingBottom: theme.spacing.md }}>
                {message}
              </Text>
            ) : null}
          </View>
        ) : null}
        {options.map((opt, i) => (
          <Pressable
            key={i}
            onPress={() => {
              onClose();
              opt.onPress();
            }}
            style={{
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.lg,
              borderTopWidth: i === 0 && !title ? 0 : 1,
              borderTopColor: theme.colors.border,
            }}
          >
            <Text color={opt.destructive ? theme.colors.danger : theme.colors.textPrimary}>{opt.label}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={onClose}
          style={{
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.lg,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}
        >
          <Text color={theme.colors.textSecondary} style={{ fontWeight: '600' }}>
            Cancel
          </Text>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}
