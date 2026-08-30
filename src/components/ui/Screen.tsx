import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  View,
  ViewStyle,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
  keyboardAvoiding?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
  backgroundColor?: string;
}

/** Standard screen wrapper: safe area, background, optional scroll + pull-to-refresh. */
export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top', 'bottom'],
  keyboardAvoiding = false,
  contentContainerStyle,
  style,
  refreshing,
  onRefresh,
  backgroundColor,
}: ScreenProps) {
  const theme = useTheme();
  const bg = backgroundColor ?? theme.colors.background;
  const pad = padded ? { padding: theme.layout.screenPadding } : null;

  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[{ flexGrow: 1 }, pad, contentContainerStyle]}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, pad, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: bg }, style]}>
      <StatusBar style="dark" />
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}
