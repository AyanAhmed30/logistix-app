const envSchema = {
  supabaseUrl: normalizeSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''),
  supabaseAnonKey: (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim(),
} as const;

export const ENV = envSchema;

/** Supabase client expects project root URL, NOT .../rest/v1 */
export function normalizeSupabaseUrl(url: string): string {
  return url
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/$/, '');
}

export function validateEnv(): void {
  const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

  if (!ENV.supabaseUrl || !ENV.supabaseAnonKey) {
    console.warn(
      '[ENV] Missing Supabase credentials. Copy .env.example to .env and set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
    return;
  }

  if (
    ENV.supabaseUrl.includes('your-project-ref') ||
    ENV.supabaseAnonKey.includes('your-key-here')
  ) {
    console.warn('[ENV] Supabase credentials still use placeholder values from .env.example.');
  }

  if (__DEV__) {
    console.log('[ENV] SUPABASE URL:', ENV.supabaseUrl);
    console.log('[ENV] SUPABASE KEY configured:', Boolean(ENV.supabaseAnonKey));
    console.log(
      '[ENV] KEY TYPE:',
      ENV.supabaseAnonKey.startsWith('sb_publishable_')
        ? 'publishable'
        : ENV.supabaseAnonKey.startsWith('eyJ')
          ? 'legacy-jwt'
          : 'unknown',
    );
  }

  if (/\/rest\/v1\/?$/i.test(rawUrl.trim())) {
    console.warn(
      '[ENV] EXPO_PUBLIC_SUPABASE_URL should NOT include /rest/v1. Use: https://your-project.supabase.co',
    );
  }
}
