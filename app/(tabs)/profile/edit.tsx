import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, ScreenContainer, TextInput } from '@/components/ui';
import { ErrorBanner } from '@/components/auth';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/providers';
import { updateCustomerProfile } from '@/services/auth';
import { getAuthErrorMessage } from '@/utils/auth-errors';
import {
  emailFieldSchema,
  firstNameFieldSchema,
  lastNameFieldSchema,
} from '@/utils/validation';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, sessionToken, updateUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSave = async () => {
    if (!sessionToken) {
      setError('Your session expired. Please sign in again.');
      return;
    }

    const first = firstNameFieldSchema.safeParse(firstName.trim());
    const last = lastNameFieldSchema.safeParse(lastName.trim());
    const mail = emailFieldSchema.safeParse(email.trim().toLowerCase());

    if (!first.success) {
      setError(first.error.issues[0]?.message ?? 'Invalid first name');
      return;
    }
    if (!last.success) {
      setError(last.error.issues[0]?.message ?? 'Invalid last name');
      return;
    }
    if (!mail.success) {
      setError(mail.error.issues[0]?.message ?? 'Invalid email');
      return;
    }

    setError(null);
    setLoading(true);
    const result = await updateCustomerProfile(sessionToken, {
      firstName: first.data,
      lastName: last.data,
      email: mail.data,
    });
    setLoading(false);

    if (result.error || !result.data) {
      setError(getAuthErrorMessage(result.error));
      return;
    }

    await updateUser(result.data);
    router.back();
  };

  return (
    <ScreenContainer
      title="Edit profile"
      subtitle="Update your name and email"
      headerRight={
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      }
    >
      {error ? <ErrorBanner message={error} /> : null}

      <View style={styles.form}>
        <TextInput
          label="First name"
          value={firstName}
          onChangeText={(v) => {
            setFirstName(v);
            setError(null);
          }}
          autoComplete="given-name"
        />
        <TextInput
          label="Last name"
          value={lastName}
          onChangeText={(v) => {
            setLastName(v);
            setError(null);
          }}
          autoComplete="family-name"
        />
        <TextInput
          label="Email"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setError(null);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <View style={styles.phoneBox}>
          <Text style={styles.phoneLabel}>Phone (read-only)</Text>
          <Text style={styles.phoneValue}>{user?.phone ?? '—'}</Text>
          <Text style={styles.phoneHint}>
            Phone links your freight requests. Contact support if you need to change it.
          </Text>
        </View>

        <Button label="Save changes" fullWidth size="lg" loading={loading} onPress={onSave} />
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
  phoneBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  phoneLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  phoneValue: {
    ...typography.body,
    color: colors.text,
  },
  phoneHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
});
