import 'react-native-url-polyfill/auto';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { ENV, normalizeSupabaseUrl } from '@/constants/env';

let supabaseInstance: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(ENV.supabaseUrl && ENV.supabaseAnonKey);
}

/** Database-only client. No Supabase Auth sessions are used. */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Create a .env file with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart Expo.',
    );
  }

  if (!supabaseInstance) {
    const url = normalizeSupabaseUrl(ENV.supabaseUrl);

    supabaseInstance = createClient(url, ENV.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          apikey: ENV.supabaseAnonKey,
        },
      },
    });
  }

  return supabaseInstance;
}
