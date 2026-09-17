import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthFooterLink, AuthScreenLayout, ErrorBanner, PakistanPhoneField } from '@/components/auth';
import { Button, TextInput } from '@/components/ui';
import { AUTH_ROUTES } from '@/navigation/routes';
import { colors, spacing, typography } from '@/constants/theme';
import { completePasswordReset, requestPasswordReset } from '@/services/auth';
import { getAuthErrorMessage } from '@/utils/auth-errors';
import {
  extractPakistanLocalDigits,
  normalizePakistanPhone,
  passwordFieldSchema,
} from '@/utils/validation';

type Step = 'identify' | 'password' | 'done';

export function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('identify');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onRequestReset = async () => {
    const local = extractPakistanLocalDigits(phone);
    if (!/^3\d{9}$/.test(local)) {
      setError('Enter a valid 10-digit mobile number starting with 3.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Enter the email on your Logistix account.');
      return;
    }

    setError(null);
    setLoading(true);
    const result = await requestPasswordReset(
      normalizePakistanPhone(phone),
      email.trim().toLowerCase(),
    );
    setLoading(false);

    if (result.error || !result.data) {
      setError(getAuthErrorMessage(result.error));
      return;
    }

    setResetToken(result.data.resetToken);
    setStep('password');
  };

  const onCompleteReset = async () => {
    if (!resetToken) {
      setError('Reset session expired. Start again.');
      setStep('identify');
      return;
    }

    const parsed = passwordFieldSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a stronger password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setLoading(true);
    const result = await completePasswordReset(resetToken, password);
    setLoading(false);

    if (result.error || !result.data) {
      setError(getAuthErrorMessage(result.error));
      return;
    }

    setStep('done');
  };

  if (step === 'done') {
    return (
      <AuthScreenLayout
        title="Password updated"
        subtitle="Sign in with your new password. Other devices were signed out for security."
        footer={
          <AuthFooterLink
            prompt=""
            linkLabel="Back to login"
            onPress={() => router.replace(AUTH_ROUTES.login)}
          />
        }
      >
        <Button
          label="Return to login"
          fullWidth
          size="lg"
          onPress={() => router.replace(AUTH_ROUTES.login)}
        />
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout
      title={step === 'identify' ? 'Reset password' : 'Choose a new password'}
      subtitle={
        step === 'identify'
          ? 'Enter the phone and email on your account. Both must match to continue.'
          : 'Create a new password for your Logistix account.'
      }
      footer={
        <AuthFooterLink
          prompt="Remembered your password?"
          linkLabel="Back to login"
          onPress={() => router.replace(AUTH_ROUTES.login)}
        />
      }
    >
      {error ? <ErrorBanner message={error} /> : null}

      {step === 'identify' ? (
        <View style={styles.form}>
          <PakistanPhoneField
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setError(null);
            }}
          />
          <TextInput
            label="Account Email"
            placeholder="you@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon="mail-outline"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setError(null);
            }}
          />
          <Text style={styles.hint}>
            Phone links your freight requests. Email must match the email used at signup.
          </Text>
          <Button
            label="Continue"
            fullWidth
            size="lg"
            loading={loading}
            onPress={onRequestReset}
          />
        </View>
      ) : (
        <View style={styles.form}>
          <TextInput
            label="New Password"
            placeholder="Create a strong password"
            secureTextEntry
            leftIcon="lock-closed-outline"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setError(null);
            }}
          />
          <TextInput
            label="Confirm Password"
            placeholder="Re-enter your password"
            secureTextEntry
            leftIcon="lock-closed-outline"
            value={confirmPassword}
            onChangeText={(v) => {
              setConfirmPassword(v);
              setError(null);
            }}
          />
          <Button
            label="Update password"
            fullWidth
            size="lg"
            loading={loading}
            onPress={onCompleteReset}
          />
          <Button
            label="Start over"
            variant="outline"
            fullWidth
            onPress={() => {
              setStep('identify');
              setResetToken(null);
              setPassword('');
              setConfirmPassword('');
              setError(null);
            }}
          />
        </View>
      )}
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  hint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
