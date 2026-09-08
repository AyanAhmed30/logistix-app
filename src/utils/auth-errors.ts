export function getAuthErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : '';

  const lower = message.toLowerCase();

  if (lower.includes('no_active_sales_agent')) {
    return 'Registration is temporarily unavailable because no active Sales Agent is available. Please try again later or contact support.';
  }
  if (lower.includes('invalid_phone')) {
    return 'Enter a valid phone number.';
  }
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
  if (lower.includes('invalid_session')) {
    return 'Your session expired. Please sign in again.';
  }
  if (lower.includes('invalid_reset_token')) {
    return 'Reset failed. Check that your phone and email match your account, then try again.';
  }
  if (lower.includes('password_unchanged')) {
    return 'Choose a new password that is different from your current one.';
  }
  if (lower.includes('invalid_email')) {
    return 'Enter a valid email address.';
  }
  if (lower.includes('invalid_name')) {
    return 'Enter a valid first and last name.';
  }
  if (lower.includes('database_access_denied') || lower.includes('row-level security')) {
    return 'Database permissions are not set up. Run supabase/migrations/014 and 015 in Supabase SQL Editor.';
  }
  if (lower.includes('supabase is not configured')) {
    return 'Missing Supabase config. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env, then restart Expo.';
  }
  if (lower.includes('network_request_failed') || lower === 'typeerror: failed to fetch' || lower.includes('failed to fetch') || lower.includes('err_internet_disconnected')) {
    return 'Cannot reach the server. Check your internet connection, disable ad blockers for this page, verify .env Supabase settings, then restart Expo and try again.';
  }

  if (message) {
    return message;
  }

  return 'Something went wrong. Please try again.';
}
