import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, Button } from '@/components/ui';
import { useTheme } from '@/theme';
import { APP_NAME, SUPPORT_EMAIL } from '@/config/constants';

const FAQS: { q: string; a: string }[] = [
  {
    q: 'How do I contact a landlord?',
    a: 'Open a listing and tap “Contact Landlord”. You choose what to share (move-in date, budget, university) and it starts a chat with the listing pinned for context.',
  },
  {
    q: 'What does “Hommie Verified” mean?',
    a: 'Verified landlords have confirmed their identity and property ownership with our team. It is a trust signal, not a guarantee. Always view a place before paying anything.',
  },
  {
    q: 'How does roommate matching work?',
    a: 'The match percentage is an estimate from your budget, area and move-in window, plus lifestyle answers. Publish a roommate profile to appear in other students’ matches.',
  },
  {
    q: 'Is my information private?',
    a: 'Your lifestyle answers stay private until you publish a roommate profile. When you send an enquiry you pick exactly which details the landlord sees.',
  },
  {
    q: 'How do I report something?',
    a: 'Use the “⋯” menu on any listing, post or profile. Reports go straight to our moderation team.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      onPress={() => setOpen((o) => !o)}
      style={{ paddingVertical: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Text variant="h3" style={{ flex: 1, fontSize: 15 }}>
          {q}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.textTertiary} />
      </View>
      {open ? (
        <Text variant="bodySm" muted style={{ marginTop: 6, lineHeight: 20 }}>
          {a}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function SupportHelp() {
  const theme = useTheme();

  return (
    <Screen scroll>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Support & Help',
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerTintColor: theme.colors.textPrimary,
        }}
      />
      <View style={{ gap: theme.spacing.xl, paddingTop: theme.spacing.md }}>
        <View>
          <Text variant="h3" style={{ marginBottom: 4 }}>
            Frequently asked
          </Text>
          {FAQS.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="h3">Still stuck?</Text>
          <Text variant="bodySm" muted>
            Email us and we’ll get back to you within a day.
          </Text>
          <Button
            title="Email support"
            variant="secondary"
            leftIcon={<Ionicons name="mail-outline" size={16} color={theme.colors.primaryPressed} />}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${APP_NAME} support`)}`)}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: theme.spacing.xl, justifyContent: 'center' }}>
          <Pressable onPress={() => Linking.openURL('https://hommie.app/privacy')}>
            <Text variant="caption" color={theme.colors.primary}>
              Privacy Policy
            </Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL('https://hommie.app/terms')}>
            <Text variant="caption" color={theme.colors.primary}>
              Terms of Service
            </Text>
          </Pressable>
        </View>

        <Text variant="caption" muted align="center">
          {APP_NAME} · v1.0.0
        </Text>
      </View>
    </Screen>
  );
}
