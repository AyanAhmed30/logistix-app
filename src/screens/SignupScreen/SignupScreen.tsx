import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { AuthScreenLayout } from '@/components/auth';
import { Button, TextInput } from '@/components/ui';
import { useSignupFlow } from '@/hooks/useSignupFlow';
import { AUTH_ROUTES } from '@/navigation/routes';
import { normalizePhoneNumber, phoneFieldSchema } from '@/utils/validation';

const signupPhoneSchema = z.object({
  phone: phoneFieldSchema,
});

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
    const normalizedPhone = normalizePhoneNumber(values.phone);
    setPhone(normalizedPhone);
    router.push(AUTH_ROUTES.signupWizard);
  };

  return (
    <AuthScreenLayout
      title="Create your account"
      subtitle="Enter your phone number to get started."
    >
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
              hint="Include country code (e.g. +1 for US, +92 for Pakistan)."
            />
          )}
        />

        <Button label="Continue" fullWidth size="lg" onPress={handleSubmit(onSubmit)} />
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 20,
  },
});
