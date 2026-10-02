import { Platform, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MessagesScreen } from '@/features/messaging/MessagesScreen';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';
import { WEB_WIDE_BREAKPOINT } from '@/components/WebAppFrame';

/**
 * Top-level /messages route — didn't exist before this; the native apps
 * only ever reach MessagesScreen nested inside the (student)/(landlord)
 * tab groups. Added for the web app (see the web-app plan), which has no
 * tab bar, but this is just as valid a deep-link target on native.
 */
export default function Messages() {
  const { role } = useAuth();
  const { width } = useWindowDimensions();
  const theme = useTheme();

  // On desktop web, app/messages/_layout.tsx already renders the
  // conversation list permanently in the left pane — this route is just
  // the right pane's "nothing selected yet" content there, not a second
  // copy of the list. Native and narrow/mobile-web render the list here
  // as the whole screen, same as always.
  if (Platform.OS === 'web' && width >= WEB_WIDE_BREAKPOINT) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm }}>
        <Ionicons name="chatbubbles-outline" size={40} color={theme.colors.textTertiary} />
        <Text muted>Select a conversation to start messaging</Text>
      </View>
    );
  }

  return <MessagesScreen role={role === 'landlord' ? 'landlord' : 'student'} />;
}
