import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen, Text, Button } from '@/components/ui';
import { Logo } from '@/components/Brand/Logo';
import { useTheme } from '@/theme';
import { analytics } from '@/services/analytics';
import type { UserRole } from '@/types/database';

type RoleOption = {
  role: UserRole;
  title: string;
  blurb: string;
  image: string;
  renderIcon: (color: string) => ReactNode;
};

const ROLES: RoleOption[] = [
  {
    role: 'student',
    title: "I'm a Student",
    blurb: 'Find a place, meet roommates, and settle in.',
    image: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1000',
    renderIcon: (color) => <Ionicons name="school" size={22} color={color} />,
  },
  {
    role: 'landlord',
    title: "I'm a Landlord",
    blurb: 'List your property and manage enquiries.',
    image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1000',
    renderIcon: (color) => <MaterialCommunityIcons name="hand-coin" size={22} color={color} />,
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
    <Screen scroll contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
      <View style={{ alignItems: 'center', gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
        <Logo size={56} />
        <Text variant="h1" align="center">
          How will you use Hommie?
        </Text>
        <Text variant="body" muted align="center" style={{ maxWidth: 300 }}>
          Tell us who you are so we can tailor the experience to your needs.
        </Text>
      </View>

      <View style={{ gap: theme.spacing.lg, marginTop: theme.spacing['2xl'] }}>
        {ROLES.map((r) => {
          const active = selected === r.role;
          return (
            <Pressable
              key={r.role}
              onPress={() => setSelected(r.role)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${r.title}. ${r.blurb}`}
              style={{
                borderRadius: theme.radius.xl,
                borderWidth: active ? 2 : 1,
                borderColor: active ? theme.colors.primary : theme.colors.border,
                backgroundColor: theme.colors.surface,
                padding: theme.spacing.lg,
                gap: theme.spacing.md,
                ...(active ? theme.shadows.md : theme.shadows.sm),
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
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
                  {r.renderIcon(theme.colors.primary)}
                </View>
                {active ? (
                  <View style={{ marginLeft: 'auto' }}>
                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                  </View>
                ) : null}
              </View>

              <View style={{ gap: 3 }}>
                <Text variant="h3">{r.title}</Text>
                <Text variant="bodySm" muted>
                  {r.blurb}
                </Text>
              </View>

              <Image
                source={{ uri: r.image }}
                style={{
                  width: '100%',
                  height: 150,
                  borderRadius: theme.radius.lg,
                  backgroundColor: theme.colors.primarySubtle,
                }}
                contentFit="cover"
                transition={200}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1, minHeight: theme.spacing.xl }} />

      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.xl }}>
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
    </Screen>
  );
}
