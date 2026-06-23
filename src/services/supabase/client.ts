import { Platform } from 'react-native';

/**
 * URL polyfill is required for React Native native platforms only.
 * On web it can break outbound fetch to external hosts (e.g. Supabase).
 */
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native-url-polyfill/auto');
}

import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { ENV, normalizeSupabaseUrl } from '@/constants/env';

let supabaseInstance: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(ENV.supabaseUrl && ENV.supabaseAnonKey);
}

export function isPublishableSupabaseKey(key: string): boolean {
  return key.startsWith('sb_publishable_');
}

function createNetworkAwareFetch(supabaseKey: string): typeof fetch {
  return async (input, init) => {
    try {
      return await fetch(input, init);
    } catch (error) {
      if (error instanceof TypeError) {
        const message = (error.message ?? '').toLowerCase();
        if (
          message.includes('failed to fetch') ||
          message.includes('network request failed') ||
          message.includes('networkerror')
        ) {
          throw new Error(
            'network_request_failed: Unable to reach Supabase from this device. Check your internet connection, disable browser ad blockers for localhost, and confirm EXPO_PUBLIC_SUPABASE_URL in .env is correct.',
          );
        }
      }
      throw error;
    }
  };
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
    const key = ENV.supabaseAnonKey;
    const networkFetch = createNetworkAwareFetch(key);

    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: networkFetch,
        headers: {
          apikey: key,
          ...(isPublishableSupabaseKey(key)
            ? { Authorization: `Bearer ${key}` }
            : {}),
        },
      },
    });
  }

  return supabaseInstance;
}

/** Lightweight connectivity probe used before signup/login. */
export async function probeSupabaseConnection(): Promise<{ ok: true } | { ok: false; error: Error }> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        ok: false,
        error: new Error(
          'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.',
        ),
      };
    }

    const { error } = await getSupabase().from('users').select('id').limit(1).maybeSingle();

    if (error) {
      return { ok: false, error: new Error(error.message || 'Database request failed.') };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error('network_request_failed'),
    };
  }
}
