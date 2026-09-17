import { z } from 'zod';

export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[\s()-]/g, '');
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

/** Strip to Pakistan local mobile digits (3XXXXXXXXX). */
export function extractPakistanLocalDigits(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('92')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** Build E.164 Pakistan number from local mobile digits. */
export function normalizePakistanPhone(localInput: string): string {
  const local = extractPakistanLocalDigits(localInput);
  return `+92${local}`;
}

/** Local PK mobile only — UI shows fixed +92 with flag. */
export const pakistanLocalPhoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .refine((value) => /^3\d{9}$/.test(extractPakistanLocalDigits(value)), {
    message: 'Enter a valid 10-digit mobile number starting with 3',
  });

export const phoneFieldSchema = z
  .string()
  .min(1, 'Phone number is required')
  .refine((value) => {
    const cleaned = value.replace(/[\s()-]/g, '');
    return /^\+?[1-9]\d{7,14}$/.test(cleaned);
  }, 'Enter a valid phone number with country code (e.g. +14155552671)');

export const phoneSchema = phoneFieldSchema.transform(normalizePhoneNumber);

export const emailFieldSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Enter a valid email address');

export const firstNameFieldSchema = z
  .string()
  .min(1, 'First name is required')
  .max(50, 'First name is too long')
  .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters');

export const lastNameFieldSchema = z
  .string()
  .min(1, 'Last name is required')
  .max(50, 'Last name is too long')
  .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters');

export const passwordFieldSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[0-9]/, 'Password must include a number');

export const confirmPasswordFieldSchema = z.string().min(1, 'Please confirm your password');

export const signupWizardSchema = z
  .object({
    email: emailFieldSchema,
    firstName: firstNameFieldSchema,
    lastName: lastNameFieldSchema,
    password: passwordFieldSchema,
    confirmPassword: confirmPasswordFieldSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  phone: pakistanLocalPhoneSchema,
  password: z.string().min(1, 'Password is required'),
});

export const signupPhoneSchema = z.object({
  phone: pakistanLocalPhoneSchema,
});

export type SignupWizardFormValues = z.infer<typeof signupWizardSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;

export const SIGNUP_WIZARD_STEPS = [
  'email',
  'firstName',
  'lastName',
  'password',
  'confirmPassword',
] as const;

export type SignupWizardStep = (typeof SIGNUP_WIZARD_STEPS)[number];

export const signupWizardStepSchemas: Record<SignupWizardStep, z.ZodType<string>> = {
  email: emailFieldSchema,
  firstName: firstNameFieldSchema,
  lastName: lastNameFieldSchema,
  password: passwordFieldSchema,
  confirmPassword: confirmPasswordFieldSchema,
};

export const signupWizardStepLabels: Record<SignupWizardStep, string> = {
  email: 'Email Address',
  firstName: 'First Name',
  lastName: 'Last Name',
  password: 'Password',
  confirmPassword: 'Confirm Password',
};
