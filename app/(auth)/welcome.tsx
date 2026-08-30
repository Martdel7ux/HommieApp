import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, Button } from '@/components/ui';
import { Logo } from '@/components/Brand/Logo';
import { useTheme } from '@/theme';
import { analytics } from '@/services/analytics';
import type { UserRole } from '@/types/database';

const ROLES: {
  role: UserRole;
  title: string;
  blurb: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    role: 'student',
    title: "I'm a Student",
    blurb: 'Find accommodation, roommates, events, community, and student essentials.',
    icon: 'school-outline',
  },
  {
    role: 'landlord',
    title: "I'm a Landlord",
    blurb: 'List accommodation, manage enquiries, and connect with students.',
    icon: 'business-outline',
  },
];

export default function Welcome() {
  const theme = useTheme();
  const router = useRouter();
  const [selected, setSelected] = useState<UserRole | null>(null);

  const onContinue = () => {
    if (!selected) return;
    analytics.track('role_selected', { role: selected });
    analytics.track('sign_up_started', { role: selected });
    router.push({ pathname: '/(auth)/sign-up', params: { role: selected } });
  };

  return (
    <Screen keyboardAvoiding>
      <View style={{ flex: 1, gap: theme.spacing.xl }}>
        <View style={{ gap: theme.spacing.md, marginTop: theme.spacing['3xl'] }}>
          <Logo size={40} withWordmark />
          <Text variant="bodyLg" muted>
            Student life in Cyprus — housing, roommates, community and more.
          </Text>
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <Text variant="h3">How will you use Hommie?</Text>
          {ROLES.map((r) => {
            const active = selected === r.role;
            return (
              <Pressable
                key={r.role}
                onPress={() => setSelected(r.role)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={r.title}
                style={{
                  flexDirection: 'row',
                  gap: theme.spacing.md,
                  padding: theme.spacing.lg,
                  borderRadius: theme.radius.lg,
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                  backgroundColor: active ? theme.colors.surfaceAlt : theme.colors.surface,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: theme.colors.primarySubtle,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={r.icon} size={22} color={theme.colors.primaryPressed} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="h3">{r.title}</Text>
                  <Text variant="bodySm" muted>
                    {r.blurb}
                  </Text>
                </View>
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={active ? theme.colors.primary : theme.colors.borderStrong}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={{ flex: 1 }} />

        <View style={{ gap: theme.spacing.md }}>
          <Button title="Continue" disabled={!selected} onPress={onContinue} />
          <Pressable
            onPress={() => router.push('/(auth)/sign-in')}
            accessibilityRole="link"
            style={{ alignSelf: 'center', padding: theme.spacing.sm }}
          >
            <Text variant="label" color={theme.colors.primary}>
              I already have an account
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
