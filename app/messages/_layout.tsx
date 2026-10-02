import { Platform, useWindowDimensions, View } from 'react-native';
import { Slot, Stack } from 'expo-router';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { MessagesScreen } from '@/features/messaging/MessagesScreen';
import { WEB_WIDE_BREAKPOINT } from '@/components/WebAppFrame';

/**
 * Desktop web gets a real master-detail split — conversation list always
 * visible on the left, the open thread on the right — instead of the
 * native/mobile-web pattern of one full-screen pane that pushes to another
 * (which is how every messaging app other than this one already behaves on
 * desktop: Gmail, Slack, WhatsApp Web). Native and narrow/mobile-web are
 * completely unchanged (plain Stack, index pushes to [id] as before).
 *
 * The list lives here, rendered once, so it survives navigating between
 * /messages and /messages/[id] (which only swaps the detail Slot on the
 * right) — app/messages/index.tsx itself renders a lightweight "pick a
 * conversation" placeholder instead of a second copy of the list while
 * this split is active.
 */
export default function MessagesLayout() {
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const { role } = useAuth();
  const isSplit = Platform.OS === 'web' && width >= WEB_WIDE_BREAKPOINT;

  if (!isSplit) {
    return <Stack screenOptions={{ headerShown: false }} />;
  }

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View style={{ width: 360, borderRightWidth: 1, borderRightColor: theme.colors.border }}>
        <MessagesScreen role={role === 'landlord' ? 'landlord' : 'student'} />
      </View>
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
    </View>
  );
}
