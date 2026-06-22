export function getAuthErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : '';

  const lower = message.toLowerCase();

  if (lower.includes('invalid_credentials')) {
    return 'Invalid phone number or password. Please try again.';
  }
  if (lower.includes('duplicate_phone')) {
    return 'This phone number is already registered. Please log in instead.';
  }
  if (lower.includes('duplicate_email')) {
    return 'This email is already registered. Please use a different email or log in.';
  }
  if (lower.includes('duplicate_account') || lower.includes('unique constraint')) {
    return 'An account with this phone number or email already exists. Please log in instead.';
  }
  if (lower.includes('weak_password') || lower.includes('password hashing failed')) {
    return 'Could not secure your password. Please try again.';
  }
  if (lower.includes('database_access_denied') || lower.includes('row-level security')) {
    return 'Database permissions are not set up. Run supabase/migrations/008_direct_users_access.sql in Supabase SQL Editor.';
  }
  if (lower.includes('supabase is not configured')) {
    return 'Missing Supabase config. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env, then restart Expo.';
  }
  if (lower === 'typeerror: failed to fetch' || lower.includes('err_internet_disconnected')) {
    return 'No internet connection. Connect to the internet and try again.';
  }

  if (message) {
    return message;
  }

  return 'Something went wrong. Please try again.';
}
