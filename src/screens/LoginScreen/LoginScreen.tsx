import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthFooterLink, AuthScreenLayout, ErrorBanner } from '@/components/auth';
import { Button, TextInput } from '@/components/ui';
import { AUTH_ROUTES, APP_ROUTES } from '@/navigation/routes';
import { useAuth } from '@/providers';
import { loginUser } from '@/services/auth';
import { getAuthErrorMessage } from '@/utils/auth-errors';
import { LoginFormValues, loginSchema, normalizePhoneNumber } from '@/utils/validation';
import { colors, spacing, typography } from '@/constants/theme';

export function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    const normalizedPhone = normalizePhoneNumber(values.phone);

    const result = await loginUser(normalizedPhone, values.password);

    if (result.error || !result.data) {
      setFormError(getAuthErrorMessage(result.error));
      return;
    }

    await signIn(result.data.user, result.data.sessionToken, result.data.expiresAt);
    router.replace(APP_ROUTES.home as Href);
  };

  return (
    <AuthScreenLayout
      title="Welcome back"
      subtitle="Sign in with the phone number linked to your Logistix Customer ID."
      footer={
        <AuthFooterLink
          prompt="Don't have an account?"
          linkLabel="Create Account"
          onPress={() => router.push(AUTH_ROUTES.signup)}
        />
      }
    >
      {formError ? <ErrorBanner message={formError} /> : null}

      <View style={styles.form}>
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Phone Number"
              placeholder="+92 300 1234567"
              keyboardType="phone-pad"
              autoComplete="tel"
              leftIcon="call-outline"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.phone?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Password"
              placeholder="Enter your password"
              secureTextEntry
              leftIcon="lock-closed-outline"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
            />
          )}
        />

        <Pressable
          accessibilityRole="link"
          onPress={() => router.push(AUTH_ROUTES.forgotPassword)}
          style={styles.forgotWrap}
        >
          <Text style={styles.forgot}>Forgot password?</Text>
        </Pressable>

        <Button
          label="Sign In"
          fullWidth
          size="lg"
          loading={isSubmitting}
          onPress={handleSubmit(onSubmit)}
        />
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
  },
  forgot: {
    ...typography.label,
    color: colors.accent,
  },
});
