import { registerUser } from '@/services/auth';

export type CompleteRegistrationInput = {
  phone: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type CompleteRegistrationResult = {
  success: boolean;
  error: Error | null;
};

export async function completeRegistrationFlow(
  input: CompleteRegistrationInput,
): Promise<CompleteRegistrationResult> {
  const result = await registerUser({
    phone: input.phone,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    password: input.password,
  });

  if (result.error || !result.data) {
    return {
      success: false,
      error: result.error ?? new Error('Failed to create account.'),
    };
  }

  return { success: true, error: null };
}
