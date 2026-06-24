export function getPortalErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : '';

  const lower = message.toLowerCase();

  if (lower.includes('unauthorized_portal_access')) {
    return 'Your account is not authorized to view inquiries. Please sign in again.';
  }

  if (lower.includes('portal_schema_missing')) {
    return 'Inquiry access is not configured on the server yet. Contact support or run the latest Supabase migrations.';
  }

  if (lower.includes('supabase is not configured')) {
    return 'Missing Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.';
  }

  if (
    lower.includes('network_request_failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('network request failed')
  ) {
    return 'Cannot reach the server. Check your internet connection and try again.';
  }

  return message || 'Unable to load inquiries. Please try again.';
}
