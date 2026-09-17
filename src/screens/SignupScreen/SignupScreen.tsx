import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { AuthFooterLink, AuthScreenLayout, PakistanPhoneField } from '@/components/auth';
import { Button, FadeIn, ProgressBar } from '@/components/ui';
import { useSignupFlow } from '@/hooks/useSignupFlow';
import { AUTH_ROUTES } from '@/navigation/routes';
import { normalizePakistanPhone, signupPhoneSchema } from '@/utils/validation';

type SignupPhoneForm = z.infer<typeof signupPhoneSchema>;

export function SignupScreen() {
  const router = useRouter();
  const { setPhone } = useSignupFlow();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupPhoneForm>({
    resolver: zodResolver(signupPhoneSchema),
    defaultValues: { phone: '' },
  });

  const onSubmit = (values: SignupPhoneForm) => {
    setPhone(normalizePakistanPhone(values.phone));
    router.push(AUTH_ROUTES.signupWizard);
  };

  return (
    <AuthScreenLayout
      title="Create your account"
      subtitle="Start with your Pakistan mobile number."
      footer={
        <AuthFooterLink
          prompt="Already have an account?"
          linkLabel="Login"
          onPress={() => router.push(AUTH_ROUTES.login)}
        />
      }
    >
      <FadeIn>
        <View style={styles.progressWrap}>
          <ProgressBar progress={33} label="Step 1 of 2 · Phone" showPercentage={false} />
        </View>
      </FadeIn>

      <View style={styles.form}>
        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <PakistanPhoneField
              value={value}
              onChangeText={(text) => onChange(text.replace(/[^\d]/g, '').slice(0, 11))}
              onBlur={onBlur}
              error={errors.phone?.message}
            />
          )}
        />

        <Button label="Continue" fullWidth size="lg" onPress={handleSubmit(onSubmit)} />
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  progressWrap: {
    marginBottom: 4,
  },
  form: {
    gap: 20,
  },
});
