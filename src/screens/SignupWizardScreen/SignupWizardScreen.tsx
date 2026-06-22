import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthScreenLayout, ErrorBanner } from '@/components/auth';
import { Button, ProgressBar, TextInput } from '@/components/ui';
import { useSignupFlow } from '@/hooks/useSignupFlow';
import { AUTH_ROUTES } from '@/navigation/routes';
import { completeRegistrationFlow } from '@/services/registration';
import { getAuthErrorMessage } from '@/utils/auth-errors';
import { colors, typography } from '@/constants/theme';
import {
  SIGNUP_WIZARD_STEPS,
  SignupWizardFormValues,
  SignupWizardStep,
  signupWizardStepLabels,
  signupWizardStepSchemas,
} from '@/utils/validation';

const initialFormValues: SignupWizardFormValues = {
  email: '',
  firstName: '',
  lastName: '',
  password: '',
  confirmPassword: '',
};

export function SignupWizardScreen() {
  const router = useRouter();
  const { phone, resetSignupFlow } = useSignupFlow();
  const [stepIndex, setStepIndex] = useState(0);
  const [formValues, setFormValues] = useState<SignupWizardFormValues>(initialFormValues);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = SIGNUP_WIZARD_STEPS[stepIndex];
  const isLastStep = stepIndex === SIGNUP_WIZARD_STEPS.length - 1;
  const progress = Math.round(((stepIndex + 1) / SIGNUP_WIZARD_STEPS.length) * 100);

  useEffect(() => {
    if (!phone) {
      router.replace(AUTH_ROUTES.signup);
    }
  }, [phone, router]);

  const updateField = (step: SignupWizardStep, value: string) => {
    setFormValues((prev) => ({ ...prev, [step]: value }));
    setFieldError(undefined);
    setFormError(null);
  };

  const validateCurrentStep = (): boolean => {
    const schema = signupWizardStepSchemas[currentStep];
    const value = formValues[currentStep];
    const result = schema.safeParse(value);

    if (!result.success) {
      setFieldError(result.error.issues[0]?.message ?? 'Invalid value');
      return false;
    }

    if (currentStep === 'confirmPassword' && value !== formValues.password) {
      setFieldError('Passwords do not match');
      return false;
    }

    setFieldError(undefined);
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      return;
    }

    setStepIndex((prev) => prev + 1);
  };

  const handleBack = () => {
    setFieldError(undefined);
    setFormError(null);

    if (stepIndex === 0) {
      router.back();
      return;
    }

    setStepIndex((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const result = await completeRegistrationFlow({
      phone,
      email: formValues.email.trim().toLowerCase(),
      firstName: formValues.firstName.trim(),
      lastName: formValues.lastName.trim(),
      password: formValues.password,
    });

    setIsSubmitting(false);

    if (!result.success || result.error) {
      setFormError(getAuthErrorMessage(result.error));
      return;
    }

    resetSignupFlow();
    router.replace(AUTH_ROUTES.login);
  };

  const renderField = () => {
    const value = formValues[currentStep];

    switch (currentStep) {
      case 'email':
        return (
          <TextInput
            label="Email Address"
            placeholder="you@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon="mail-outline"
            value={value}
            onChangeText={(text) => updateField('email', text)}
            error={fieldError}
          />
        );
      case 'firstName':
        return (
          <TextInput
            label="First Name"
            placeholder="John"
            autoCapitalize="words"
            leftIcon="person-outline"
            value={value}
            onChangeText={(text) => updateField('firstName', text)}
            error={fieldError}
          />
        );
      case 'lastName':
        return (
          <TextInput
            label="Last Name"
            placeholder="Doe"
            autoCapitalize="words"
            leftIcon="person-outline"
            value={value}
            onChangeText={(text) => updateField('lastName', text)}
            error={fieldError}
          />
        );
      case 'password':
        return (
          <TextInput
            label="Password"
            placeholder="Create a strong password"
            secureTextEntry
            leftIcon="lock-closed-outline"
            value={value}
            onChangeText={(text) => updateField('password', text)}
            error={fieldError}
            hint="Min. 8 characters with upper, lower, and number"
          />
        );
      case 'confirmPassword':
        return (
          <TextInput
            label="Confirm Password"
            placeholder="Re-enter your password"
            secureTextEntry
            leftIcon="lock-closed-outline"
            value={value}
            onChangeText={(text) => updateField('confirmPassword', text)}
            error={fieldError}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AuthScreenLayout
      title="Create your account"
      subtitle={`Step ${stepIndex + 1} of ${SIGNUP_WIZARD_STEPS.length}: ${signupWizardStepLabels[currentStep]}`}
    >
      <View style={styles.progressWrap}>
        <ProgressBar
          progress={progress}
          label={`Step ${stepIndex + 1} of ${SIGNUP_WIZARD_STEPS.length}`}
          showPercentage={false}
        />
      </View>

      {formError ? <ErrorBanner message={formError} /> : null}

      <View style={styles.form}>
        {renderField()}

        <View style={styles.actions}>
          <Button label="Back" variant="outline" fullWidth onPress={handleBack} />
          {isLastStep ? (
            <Button
              label="Create Account"
              fullWidth
              size="lg"
              loading={isSubmitting}
              onPress={handleSubmit}
            />
          ) : (
            <Button label="Next" fullWidth size="lg" onPress={handleNext} />
          )}
        </View>
      </View>

      <Text style={styles.phoneHint}>Signing up with {phone}</Text>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  progressWrap: {
    marginBottom: 8,
  },
  form: {
    gap: 16,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  phoneHint: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginTop: 16,
    color: colors.textSecondary,
  },
});
