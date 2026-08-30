import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen, Text, Button, TextField, Banner } from '@/components/ui';
import { useTheme } from '@/theme';
import { resetRequestSchema, type ResetRequestInput } from '@/features/auth/schemas';
import { authApi } from '@/features/auth/api';
import { toAppError } from '@/services/errors';

export default function ForgotPassword() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetRequestInput>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: { email: params.email ?? '' },
  });

  const onSubmit = async ({ email }: ResetRequestInput) => {
    setSubmitError(null);
    try {
      await authApi.requestPasswordReset(email);
      setSent(true);
    } catch (e) {
      setSubmitError(toAppError(e).message);
    }
  };

  return (
    <Screen keyboardAvoiding>
      <View style={{ flex: 1, gap: theme.spacing.lg }}>
        <View style={{ gap: theme.spacing.xs, marginTop: theme.spacing['3xl'] }}>
          <Text variant="h1">Reset password</Text>
          <Text muted>We&apos;ll email you a secure link to set a new password.</Text>
        </View>

        {sent ? (
          <Banner
            tone="success"
            title="Check your email"
            message="If an account exists for that address, a reset link is on its way."
          />
        ) : (
          <>
            {submitError ? <Banner tone="danger" message={submitError} /> : null}
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <TextField
                  label="Email"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  error={errors.email?.message}
                />
              )}
            />
            <Button title="Send reset link" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
          </>
        )}

        <Pressable onPress={() => router.back()} style={{ alignSelf: 'center', padding: theme.spacing.sm }}>
          <Text variant="label" color={theme.colors.primary}>
            Back to sign in
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
