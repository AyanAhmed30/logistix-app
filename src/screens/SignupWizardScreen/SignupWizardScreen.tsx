import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthFooterLink, AuthScreenLayout, ErrorBanner } from '@/components/auth';
import { Button, FadeIn, ProgressBar, TextInput } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { colors, spacing, typography } from '@/constants/theme';
import { useSignupFlow } from '@/hooks/useSignupFlow';
import { AUTH_ROUTES } from '@/navigation/routes';
import { completeRegistrationFlow } from '@/services/registration';
import { probeSupabaseConnection } from '@/services/supabase';
import { getAuthErrorMessage } from '@/utils/auth-errors';
import {
  SignupWizardFormValues,
  emailFieldSchema,
  firstNameFieldSchema,
  lastNameFieldSchema,
  passwordFieldSchema,
  signupWizardSchema,
} from '@/utils/validation';

const initialFormValues: SignupWizardFormValues = {
  email: '',
  firstName: '',
  lastName: '',
  password: '',
  confirmPassword: '',
};

const DETAIL_STEPS = ['Email', 'Name', 'Password', 'Ready'] as const;

function isEmailComplete(form: SignupWizardFormValues) {
  return emailFieldSchema.safeParse(form.email.trim()).success;
}

function isNameComplete(form: SignupWizardFormValues) {
  return (
    firstNameFieldSchema.safeParse(form.firstName.trim()).success &&
    lastNameFieldSchema.safeParse(form.lastName.trim()).success
  );
}

function isPasswordComplete(form: SignupWizardFormValues) {
  return (
    passwordFieldSchema.safeParse(form.password).success &&
    form.confirmPassword.length > 0 &&
    form.password === form.confirmPassword
  );
}

/** Progressive index like inquiry wizard: Email → Name → Password → Ready. */
function computeActiveStep(form: SignupWizardFormValues): number {
  if (!isEmailComplete(form)) return 0;
  if (!isNameComplete(form)) return 1;
  if (!isPasswordComplete(form)) return 2;
  return 3;
}

export function SignupWizardScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { phone, resetSignupFlow } = useSignupFlow();
  const [formValues, setFormValues] = useState<SignupWizardFormValues>(initialFormValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof SignupWizardFormValues, string>>>(
    {},
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectionChecked, setConnectionChecked] = useState(false);
  const signupCompletedRef = useRef(false);

  const step = useMemo(() => computeActiveStep(formValues), [formValues]);
  // Overall signup: phone done (step 1/2) + details progress within step 2
  const progress = useMemo(() => 50 + ((step + 1) / DETAIL_STEPS.length) * 50, [step]);

  useEffect(() => {
    if (!phone && !signupCompletedRef.current) {
      router.replace(AUTH_ROUTES.signup);
    }
  }, [phone, router]);

  useEffect(() => {
    let mounted = true;
    probeSupabaseConnection().then((result) => {
      if (!mounted) return;
      setConnectionChecked(true);
      if (!result.ok) {
        setFormError(getAuthErrorMessage(result.error));
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const updateField = <K extends keyof SignupWizardFormValues>(key: K, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    setFormError(null);
  };

  const validateAll = (): boolean => {
    const parsed = signupWizardSchema.safeParse({
      ...formValues,
      email: formValues.email.trim().toLowerCase(),
      firstName: formValues.firstName.trim(),
      lastName: formValues.lastName.trim(),
    });

    if (!parsed.success) {
      const next: Partial<Record<keyof SignupWizardFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof SignupWizardFormValues | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      // Extra password match check if schema path differs
      if (
        formValues.confirmPassword &&
        formValues.password !== formValues.confirmPassword &&
        !next.confirmPassword
      ) {
        next.confirmPassword = 'Passwords do not match';
      }
      setFieldErrors(next);
      return false;
    }

    if (formValues.password !== formValues.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' });
      return false;
    }

    setFieldErrors({});
    return true;
  };

  const handleSubmit = async () => {
    if (!validateAll() || isSubmitting) return;

    setIsSubmitting(true);
    setFormError(null);

    const result = await completeRegistrationFlow({
      phone,
      email: formValues.email.trim().toLowerCase(),
      firstName: formValues.firstName.trim(),
      lastName: formValues.lastName.trim(),
      password: formValues.password,
    });

    if (!result.success || result.error) {
      setIsSubmitting(false);
      setFormError(getAuthErrorMessage(result.error));
      return;
    }

    signupCompletedRef.current = true;
    resetSignupFlow();
    showToast({
      message: 'Account created successfully. Please sign in.',
      tone: 'success',
      durationMs: 3200,
    });
    router.replace(AUTH_ROUTES.login);
  };

  return (
    <AuthScreenLayout
      title="Almost there"
      subtitle="Complete your profile to finish signup."
      footer={
        <AuthFooterLink
          prompt="Already have an account?"
          linkLabel="Login"
          onPress={() => router.replace(AUTH_ROUTES.login)}
        />
      }
    >
      <FadeIn>
        <View style={styles.progressWrap}>
          <ProgressBar
            progress={Math.round(progress)}
            label={`Step 2 of 2 · ${DETAIL_STEPS[step]}`}
            showPercentage={false}
          />
        </View>
      </FadeIn>

      {formError ? <ErrorBanner message={formError} /> : null}

      <View style={styles.form}>
        <TextInput
          label="Email Address"
          placeholder="you@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          leftIcon="mail-outline"
          value={formValues.email}
          onChangeText={(text) => updateField('email', text)}
          error={fieldErrors.email}
        />

        <TextInput
          label="First Name"
          placeholder="John"
          autoCapitalize="words"
          leftIcon="person-outline"
          value={formValues.firstName}
          onChangeText={(text) => updateField('firstName', text)}
          error={fieldErrors.firstName}
        />

        <TextInput
          label="Last Name"
          placeholder="Doe"
          autoCapitalize="words"
          leftIcon="person-outline"
          value={formValues.lastName}
          onChangeText={(text) => updateField('lastName', text)}
          error={fieldErrors.lastName}
        />

        <TextInput
          label="Password"
          placeholder="Create a strong password"
          secureTextEntry
          leftIcon="lock-closed-outline"
          value={formValues.password}
          onChangeText={(text) => updateField('password', text)}
          error={fieldErrors.password}
          hint="Min. 8 characters with upper, lower, and number"
        />

        <TextInput
          label="Confirm Password"
          placeholder="Re-enter your password"
          secureTextEntry
          leftIcon="lock-closed-outline"
          value={formValues.confirmPassword}
          onChangeText={(text) => updateField('confirmPassword', text)}
          error={fieldErrors.confirmPassword}
        />

        <View style={styles.actions}>
          <Button label="Back" variant="outline" fullWidth onPress={() => router.back()} />
          <Button
            label="Create Account"
            fullWidth
            size="lg"
            loading={isSubmitting}
            disabled={!connectionChecked}
            onPress={handleSubmit}
          />
        </View>
      </View>

      <Text style={styles.phoneHint}>Signing up with {phone}</Text>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  progressWrap: {
    marginBottom: spacing.xs,
  },
  form: {
    gap: spacing.md,
    width: '100%',
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
    width: '100%',
  },
  phoneHint: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },
});
