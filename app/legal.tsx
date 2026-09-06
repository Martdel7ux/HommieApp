import { useState } from 'react';
import { View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Screen, Text, SegmentedControl } from '@/components/ui';
import { useTheme } from '@/theme';
import { MarkdownLite } from '@/components/MarkdownLite';
import { TERMS_OF_SERVICE, PRIVACY_POLICY, LEGAL_LAST_UPDATED } from '@/content/legal';

type Doc = 'terms' | 'privacy';

export default function Legal() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ doc?: string }>();
  const [doc, setDoc] = useState<Doc>(params.doc === 'privacy' ? 'privacy' : 'terms');

  return (
    <Screen scroll>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Legal',
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerTintColor: theme.colors.textPrimary,
        }}
      />

      <View style={{ paddingTop: theme.spacing.sm, paddingBottom: theme.spacing['5xl'] }}>
        <SegmentedControl<Doc>
          options={[
            { value: 'terms', label: 'Terms of Service' },
            { value: 'privacy', label: 'Privacy Policy' },
          ]}
          value={doc}
          onChange={setDoc}
        />

        <View style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.xl }}>
          <Text variant="h2">{doc === 'terms' ? 'Terms of Service' : 'Privacy Policy'}</Text>
          <Text variant="caption" muted style={{ marginTop: 2 }}>
            Last updated {LEGAL_LAST_UPDATED}
          </Text>
        </View>

        <MarkdownLite content={doc === 'terms' ? TERMS_OF_SERVICE : PRIVACY_POLICY} />
      </View>
    </Screen>
  );
}
