import { Linking, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, Button } from '@/components/ui';
import { Logo } from '@/components/Brand/Logo';
import { useTheme } from '@/theme';
import { authApi } from '@/features/auth/api';

/**
 * Where a signed-in landlord lands on the web app (see AuthGate.tsx).
 * Creating/editing listings (the 5-step wizard, photo uploads, the
 * enquiry inbox) is explicitly out of scope for the web app — see the
 * web-app plan. This points them at the real app instead of offering a
 * cut-down web version of listing management.
 */
export default function LandlordWeb() {
  const theme = useTheme();

  return (
    <Screen scroll contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg, paddingVertical: theme.spacing['3xl'] }}>
        <Logo size={48} />
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: theme.colors.primarySubtle,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="business-outline" size={32} color={theme.colors.primary} />
        </View>
        <Text variant="h1" align="center" style={{ maxWidth: 360 }}>
          List your property from the Hommie app
        </Text>
        <Text muted align="center" style={{ maxWidth: 360 }}>
          Creating and managing listings, and replying to enquiries, is only
          available in the Hommie app for now. Download it to get started —
          your account is already set up.
        </Text>
        <Button title="Get the app" onPress={() => Linking.openURL('https://hommieapp.com/#download')} />
        <Button title="Sign out" variant="ghost" onPress={() => authApi.signOut()} />
      </View>
    </Screen>
  );
}
