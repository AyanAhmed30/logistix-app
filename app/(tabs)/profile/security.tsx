import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ErrorBanner } from '@/components/auth';
import { Button, ScreenContainer, TextInput } from '@/components/ui';
import { colors, spacing, typography } from '@/constants/theme';
import { AUTH_ROUTES } from '@/navigation/routes';
import { useAuth } from '@/providers';
import { changeCustomerPassword } from '@/services/auth';
import { getAuthErrorMessage } from '@/utils/auth-errors';
import { passwordFieldSchema } from '@/utils/validation';

export default function SecurityScreen() {
  const router = useRouter();
  const { sessionToken } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSave = async () => {
    if (!sessionToken) {
      setError('Your session expired. Please sign in again.');
      return;
    }
    if (!currentPassword) {
      setError('Enter your current password.');
      return;
    }
    const parsed = passwordFieldSchema.safeParse(newPassword);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a stronger password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError(null);
    setLoading(true);
    const result = await changeCustomerPassword(sessionToken, currentPassword, newPassword);
    setLoading(false);

    if (result.error || !result.data) {
      setError(getAuthErrorMessage(result.error));
      return;
    }

    setSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <ScreenContainer
      title="Security"
      subtitle="Change your password"
      headerRight={
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.cancel}>Back</Text>
        </Pressable>
      }
    >
      {error ? <ErrorBanner message={error} /> : null}
      {success ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>Password updated. Other devices were signed out.</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <TextInput
          label="Current password"
          secureTextEntry
          leftIcon="lock-closed-outline"
          value={currentPassword}
          onChangeText={(v) => {
            setCurrentPassword(v);
            setError(null);
            setSuccess(false);
          }}
        />
        <TextInput
          label="New password"
          secureTextEntry
          leftIcon="lock-closed-outline"
          value={newPassword}
          onChangeText={(v) => {
            setNewPassword(v);
            setError(null);
            setSuccess(false);
          }}
        />
        <TextInput
          label="Confirm new password"
          secureTextEntry
          leftIcon="lock-closed-outline"
          value={confirmPassword}
          onChangeText={(v) => {
            setConfirmPassword(v);
            setError(null);
            setSuccess(false);
          }}
        />

        <Button label="Update password" fullWidth size="lg" loading={loading} onPress={onSave} />

        <Button
          label="Forgot password?"
          variant="outline"
          fullWidth
          onPress={() => router.push(AUTH_ROUTES.forgotPassword)}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cancel: {
    ...typography.label,
    color: colors.accent,
  },
  form: {
    gap: spacing.lg,
  },
  successBox: {
    backgroundColor: colors.successLight,
    padding: spacing.md,
    borderRadius: 12,
  },
  successText: {
    ...typography.bodySmall,
    color: '#15803D',
  },
});
