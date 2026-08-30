import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen, Text, Button, TextField, Banner } from '@/components/ui';
import { Logo } from '@/components/Brand/Logo';
import { useTheme } from '@/theme';
import { signInSchema, type SignInInput } from '@/features/auth/schemas';
import { authApi } from '@/features/auth/api';
import { toAppError } from '@/services/errors';
import { analytics } from '@/services/analytics';

export default function SignIn() {
  const theme = useTheme();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: SignInInput) => {
    setSubmitError(null);
    try {
      const data = await authApi.signIn(values);
      const role = (data.user?.user_metadata?.role as 'student' | 'landlord') ?? 'student';
      analytics.track('sign_in_completed', { role });
      // AuthGate handles the redirect once the session propagates.
    } catch (e) {
      setSubmitError(toAppError(e).message);
    }
  };

  return (
    <Screen keyboardAvoiding>
      <View style={{ flex: 1, gap: theme.spacing.lg }}>
        <View style={{ gap: theme.spacing.md, marginTop: theme.spacing['3xl'] }}>
          <Logo size={34} />
          <View style={{ gap: theme.spacing.xs }}>
            <Text variant="h1">Welcome back</Text>
            <Text muted>Sign in to your Hommie account.</Text>
          </View>
        </View>

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

        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <TextField
              label="Password"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              isPassword
              textContentType="password"
              error={errors.password?.message}
              onSubmitEditing={handleSubmit(onSubmit)}
            />
          )}
        />

        <Pressable
          onPress={() =>
            router.push({ pathname: '/(auth)/forgot-password', params: { email: getValues('email') } })
          }
          style={{ alignSelf: 'flex-end', padding: theme.spacing.xs }}
        >
          <Text variant="label" color={theme.colors.primary}>
            Forgot password?
          </Text>
        </Pressable>

        <Button title="Sign in" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />

        <View style={{ flex: 1 }} />

        <Pressable onPress={() => router.replace('/(auth)/welcome')} style={{ alignSelf: 'center', padding: theme.spacing.sm }}>
          <Text variant="label" color={theme.colors.primary}>
            New to Hommie? Create an account
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
