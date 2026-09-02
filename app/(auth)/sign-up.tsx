import { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen, Text, Button, TextField, Banner } from '@/components/ui';
import { useTheme } from '@/theme';
import { signUpSchema, type SignUpInput } from '@/features/auth/schemas';
import { authApi } from '@/features/auth/api';
import { SocialAuthButtons } from '@/features/auth/SocialAuthButtons';
import { toAppError } from '@/services/errors';
import type { UserRole } from '@/types/database';

export default function SignUp() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const role: UserRole = params.role === 'landlord' ? 'landlord' : 'student';
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      role,
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      contactName: '',
      businessName: '',
      phone: '',
      acceptTerms: false as unknown as true,
    },
  });

  const onSubmit = async (values: SignUpInput) => {
    setSubmitError(null);
    try {
      await authApi.signUp(values);
      router.replace('/(auth)/verify-email');
    } catch (e) {
      setSubmitError(toAppError(e).message);
    }
  };

  return (
    <Screen keyboardAvoiding>
      <ScrollView
        contentContainerStyle={{ gap: theme.spacing.lg, paddingBottom: theme.spacing['3xl'] }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: theme.spacing.xs, marginTop: theme.spacing.lg }}>
          <Text variant="h1">Create your account</Text>
          <Text muted>
            {role === 'landlord'
              ? 'List student-suitable properties and manage enquiries.'
              : 'Find housing, roommates and student life in Cyprus.'}
          </Text>
        </View>

        {submitError ? <Banner tone="danger" message={submitError} /> : null}

        <SocialAuthButtons role={role} onError={setSubmitError} label="or sign up with your email" />

        <Controller
          control={control}
          name="firstName"
          render={({ field }) => (
            <TextField
              label={role === 'landlord' ? 'Your first name' : 'First name'}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              autoCapitalize="words"
              textContentType="givenName"
              error={errors.firstName?.message}
            />
          )}
        />

        {role === 'landlord' ? (
          <>
            <Controller
              control={control}
              name="businessName"
              render={({ field }) => (
                <TextField
                  label="Business name (optional)"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  autoCapitalize="words"
                  error={errors.businessName?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <TextField
                  label="Phone number"
                  value={field.value ?? ''}
                  onChangeText={field.onChange}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  error={errors.phone?.message}
                />
              )}
            />
          </>
        ) : null}

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
              label="Confirm password"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              isPassword
              error={errors.confirmPassword?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="acceptTerms"
          render={({ field }) => (
            <Pressable
              onPress={() => field.onChange(!field.value)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: !!field.value }}
              style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'flex-start' }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: field.value ? theme.colors.primary : theme.colors.borderStrong,
                  backgroundColor: field.value ? theme.colors.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 1,
                }}
              >
                {field.value ? <Text color={theme.colors.onPrimary}>✓</Text> : null}
              </View>
              <Text variant="bodySm" muted style={{ flex: 1 }}>
                I agree to Hommie&apos;s Terms of Service and Privacy Policy.
              </Text>
            </Pressable>
          )}
        />
        {errors.acceptTerms ? (
          <Text variant="caption" color={theme.colors.danger}>
            {errors.acceptTerms.message}
          </Text>
        ) : null}

        <Button title="Create account" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />

        <Pressable onPress={() => router.replace('/(auth)/sign-in')} style={{ alignSelf: 'center', padding: theme.spacing.sm }}>
          <Text variant="label" color={theme.colors.primary}>
            I already have an account
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
