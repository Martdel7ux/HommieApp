import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen, Text, Button, TextField, Banner } from '@/components/ui';
import { useTheme } from '@/theme';
import { newPasswordSchema, type NewPasswordInput } from '@/features/auth/schemas';
import { authApi } from '@/features/auth/api';
import { toAppError } from '@/services/errors';

/**
 * Reached via the password-reset deep link (handled in callback.tsx, which
 * establishes a recovery session and routes here).
 */
export default function ResetPassword() {
  const theme = useTheme();
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordInput>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async ({ password }: NewPasswordInput) => {
    setSubmitError(null);
    try {
      await authApi.updatePassword(password);
      setDone(true);
      setTimeout(() => router.replace('/(auth)/sign-in'), 1500);
    } catch (e) {
      setSubmitError(toAppError(e).message);
    }
  };

  return (
    <Screen keyboardAvoiding>
      <View style={{ flex: 1, gap: theme.spacing.lg }}>
        <View style={{ gap: theme.spacing.xs, marginTop: theme.spacing['3xl'] }}>
          <Text variant="h1">Set a new password</Text>
          <Text muted>Choose a strong password you don&apos;t use elsewhere.</Text>
        </View>

        {done ? (
          <Banner tone="success" message="Password updated. Redirecting you to sign in…" />
        ) : (
          <>
            {submitError ? <Banner tone="danger" message={submitError} /> : null}
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <TextField
                  label="New password"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  isPassword
                  textContentType="newPassword"
                  hint="At least 8 characters"
                  error={errors.password?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field }) => (
                <TextField
                  label="Confirm new password"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  isPassword
                  error={errors.confirmPassword?.message}
                />
              )}
            />
            <Button title="Update password" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
          </>
        )}
      </View>
    </Screen>
  );
}
