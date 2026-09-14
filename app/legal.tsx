import { useMemo, useRef, useState } from 'react';
import { Linking, Pressable, Share, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Button, SegmentedControl } from '@/components/ui';
import { useTheme } from '@/theme';
import { LegalDocument, parseLegalDoc } from '@/components/legal/LegalDocument';
import { termsAccept } from '@/features/auth/termsAccept';
import { TERMS_OF_SERVICE, PRIVACY_POLICY, LEGAL_LAST_UPDATED } from '@/content/legal';
import { SUPPORT_EMAIL } from '@/config/constants';

type Doc = 'privacy' | 'terms';

const META: Record<Doc, { title: string; subtitle: string; contactLead: string }> = {
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'How Hommie collects, uses, and protects your personal information across housing, roommates, and student life in Cyprus.',
    contactLead: 'Questions about your data or this policy?',
  },
  terms: {
    title: 'Terms of Service',
    subtitle: 'The agreement between you and Hommie when you create an account or use the app.',
    contactLead: 'Questions about these terms?',
  },
};

export default function Legal() {
  const params = useLocalSearchParams<{ doc?: string; from?: string }>();
  // Re-mount when navigated in with a different ?doc= so the initial tab follows
  // the param, while the in-screen toggle still owns state after that.
  return (
    <LegalScreen
      key={params.doc === 'terms' ? 'terms' : 'privacy'}
      initialDoc={params.doc === 'terms' ? 'terms' : 'privacy'}
      fromSignup={params.from === 'signup'}
    />
  );
}

function LegalScreen({ initialDoc, fromSignup }: { initialDoc: Doc; fromSignup: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const [doc, setDoc] = useState<Doc>(initialDoc);

  const scrollRef = useRef<ScrollView>(null);
  const sectionsBaseY = useRef(0);
  const [sectionYs, setSectionYs] = useState<number[]>([]);

  const parsed = useMemo(() => parseLegalDoc(doc === 'terms' ? TERMS_OF_SERVICE : PRIVACY_POLICY), [doc]);
  const meta = META[doc];

  const jumpTo = (i: number) => {
    const y = sectionsBaseY.current + (sectionYs[i] ?? 0) - 12;
    scrollRef.current?.scrollTo({ y, animated: true });
  };

  const onShare = () => {
    Share.share({
      message: `Hommie ${meta.title}: hommieapp.com`,
    }).catch(() => undefined);
  };

  const acceptAndContinue = () => {
    termsAccept.set(true);
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceAlt }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Privacy & Terms',
          headerTitleAlign: 'center',
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: theme.colors.surfaceAlt },
          headerShadowVisible: false,
          headerTintColor: theme.colors.textPrimary,
          headerRight: () => (
            <Pressable onPress={onShare} hitSlop={8} accessibilityRole="button" accessibilityLabel="Share">
              <Ionicons name="share-social-outline" size={22} color={theme.colors.textPrimary} />
            </Pressable>
          ),
        }}
      />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: theme.layout.screenPadding,
          paddingBottom: fromSignup ? 120 : theme.spacing['4xl'],
          gap: theme.spacing.lg,
        }}
      >
        <SegmentedControl<Doc>
          options={[
            { value: 'privacy', label: 'Privacy Policy' },
            { value: 'terms', label: 'Terms of Service' },
          ]}
          value={doc}
          onChange={(v) => {
            setDoc(v);
            setSectionYs([]);
            scrollRef.current?.scrollTo({ y: 0, animated: false });
          }}
        />

        {/* meta pill */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: 6,
            backgroundColor: theme.colors.primarySubtle,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Ionicons name="calendar-outline" size={13} color={theme.colors.primary} />
          <Text variant="caption" color={theme.colors.primaryPressed} weight="600">
            Last updated: {LEGAL_LAST_UPDATED}
          </Text>
        </View>

        {/* title */}
        <View style={{ gap: 4 }}>
          <Text variant="h1">{meta.title}</Text>
          <Text variant="bodySm" muted>
            {meta.subtitle}
          </Text>
        </View>

        {/* section nav chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -theme.layout.screenPadding }}
          contentContainerStyle={{ paddingHorizontal: theme.layout.screenPadding, gap: theme.spacing.sm }}
        >
          {parsed.sections.map((s, i) => (
            <Pressable
              key={s.number}
              onPress={() => jumpTo(i)}
              style={{
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.pill,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: 7,
                maxWidth: 210,
              }}
            >
              <Text variant="label" color={theme.colors.primary} numberOfLines={1}>
                {s.number}. {s.title}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* intro */}
        {parsed.intro ? (
          <View style={{ gap: theme.spacing.sm }}>
            {parsed.intro
              .split(/\n\s*\n/)
              .map((p) => p.replace(/\*\*/g, '').trim())
              .filter((p) => p && !/^-{3,}$/.test(p))
              .map((p, i) => (
                <Text key={i} variant="body" muted style={{ lineHeight: 22 }}>
                  {p}
                </Text>
              ))}
          </View>
        ) : null}

        {/* section cards */}
        <View onLayout={(e) => (sectionsBaseY.current = e.nativeEvent.layout.y)}>
          <LegalDocument doc={parsed} onSectionOffsets={setSectionYs} />
        </View>

        {/* contact card */}
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: theme.colors.border,
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
          }}
        >
          <Text variant="overline" color={theme.colors.textTertiary}>
            Contact Hommie
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.colors.primarySubtle,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="mail-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodySm" muted>
                {meta.contactLead}
              </Text>
              <Text variant="bodySm" weight="600" color={theme.colors.primary}>
                {SUPPORT_EMAIL}
              </Text>
            </View>
          </View>
          <Button
            title="Email us"
            variant="secondary"
            onPress={() =>
              Linking.openURL(
                `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Hommie ${meta.title}`)}`,
              ).catch(() => undefined)
            }
            leftIcon={<Ionicons name="send" size={15} color={theme.colors.primaryPressed} />}
          />
        </View>
      </ScrollView>

      {fromSignup ? (
        <SafeAreaView
          edges={['bottom']}
          style={{
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}
        >
          <View style={{ padding: theme.spacing.lg }}>
            <Button
              title="Accept & Continue"
              onPress={acceptAndContinue}
              leftIcon={<Ionicons name="checkmark" size={17} color={theme.colors.onPrimary} />}
            />
          </View>
        </SafeAreaView>
      ) : null}
    </View>
  );
}
