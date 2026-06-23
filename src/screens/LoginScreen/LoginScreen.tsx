import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthScreenLayout, ErrorBanner, PlaceholderLogo } from '@/components/auth';
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

    await signIn(result.data);
    router.replace(APP_ROUTES.inquiries as Href);
  };

  return (
    <AuthScreenLayout
      title="Welcome back"
      subtitle="Sign in with your phone number and password."
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don&apos;t have an account?</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push(AUTH_ROUTES.signup)}>
            <Text style={styles.footerLink}>Create account</Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.logoWrap}>
        <PlaceholderLogo size="sm" />
      </View>

      {formError ? <ErrorBanner message={formError} /> : null}

      <View style={styles.form}>
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Phone Number"
              placeholder="+1 415 555 2671"
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
  logoWrap: {
    alignItems: 'center',
  },
  form: {
    gap: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  footerText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  footerLink: {
    ...typography.label,
    color: colors.primary,
  },
});
