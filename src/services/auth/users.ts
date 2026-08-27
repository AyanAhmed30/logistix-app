import { PostgrestError } from '@supabase/supabase-js';

import { getSupabase, isSupabaseConfigured, probeSupabaseConnection } from '@/services/supabase';
import { AppUser, AuthSessionPayload } from '@/types/auth';

export type AuthServiceResult<T> = {
  data: T | null;
  error: Error | null;
};

type RpcUser = {
  id: string;
  phone: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
};

type RpcAuthPayload = {
  user: RpcUser;
  session_token: string;
  expires_at: string;
};

function toUser(row: RpcUser): AppUser {
  return {
    id: row.id,
    phone: row.phone,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    createdAt: row.created_at,
  };
}

function toAuthPayload(payload: RpcAuthPayload): AuthSessionPayload {
  return {
    user: toUser(payload.user),
    sessionToken: payload.session_token,
    expiresAt: payload.expires_at,
  };
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('failed to fetch') || message.includes('network request failed')) {
      return new Error(
        'network_request_failed: Unable to reach Supabase from this device. Check your internet connection, disable browser ad blockers for localhost, and confirm EXPO_PUBLIC_SUPABASE_URL in .env is correct.',
      );
    }
    return error;
  }
  return new Error('An unexpected error occurred.');
}

function logSignupDebug(label: string, payload: unknown): void {
  if (__DEV__) {
    console.log(`[signup] ${label}`, payload);
  }
}

function mapDatabaseError(error: PostgrestError | Error): Error {
  if (error instanceof Error && !(error as PostgrestError).code) {
    return error;
  }

  const pgError = error as PostgrestError;
  const message = (pgError.message ?? '').toLowerCase();
  const code = pgError.code ?? '';
  const details = [pgError.message, pgError.details, pgError.hint].filter(Boolean).join(' | ');

  logSignupDebug('database error', {
    code,
    message: pgError.message,
    details: pgError.details,
    hint: pgError.hint,
  });

  if (message.includes('invalid_credentials')) {
    return new Error('invalid_credentials');
  }
  if (message.includes('invalid_session')) {
    return new Error('invalid_session');
  }
  if (message.includes('invalid_reset_token')) {
    return new Error('invalid_reset_token');
  }
  if (message.includes('password_unchanged')) {
    return new Error('password_unchanged');
  }
  if (message.includes('invalid_email')) {
    return new Error('invalid_email');
  }
  if (message.includes('invalid_first_name') || message.includes('invalid_last_name')) {
    return new Error('invalid_name');
  }
  if (message.includes('weak_password')) {
    return new Error('weak_password');
  }
  if (message.includes('duplicate_phone') || (message.includes('duplicate') && message.includes('phone'))) {
    return new Error('duplicate_phone');
  }
  if (message.includes('duplicate_email') || (message.includes('duplicate') && message.includes('email'))) {
    return new Error('duplicate_email');
  }
  if (message.includes('duplicate_account') || code === '23505') {
    return new Error('duplicate_account');
  }

  if (code === '42501' || message.includes('permission denied') || message.includes('row-level security')) {
    return new Error(
      'database_access_denied: Run supabase/migrations/014_identity_hardening_sessions.sql in Supabase SQL Editor.',
    );
  }

  if (message.includes('register_user') && message.includes('does not exist')) {
    return new Error(
      'database_access_denied: Run supabase/migrations/014_identity_hardening_sessions.sql in Supabase SQL Editor.',
    );
  }

  return new Error(details || pgError.message || 'Database request failed.');
}

function parseAuthPayload(data: unknown): AuthSessionPayload | null {
  if (!data || typeof data !== 'object') return null;
  const payload = data as Partial<RpcAuthPayload>;
  if (
    !payload.user ||
    typeof payload.session_token !== 'string' ||
    payload.session_token.length < 32 ||
    typeof payload.expires_at !== 'string'
  ) {
    return null;
  }
  return toAuthPayload(payload as RpcAuthPayload);
}

function parseUserOnly(data: unknown): AppUser | null {
  if (!data || typeof data !== 'object') return null;
  const payload = data as { user?: RpcUser };
  if (!payload.user?.id) return null;
  return toUser(payload.user);
}

export async function registerUser(params: {
  phone: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}): Promise<AuthServiceResult<AppUser>> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const normalizedFirstName = params.firstName.trim();
  const normalizedLastName = params.lastName.trim();

  logSignupDebug('start', {
    phone: params.phone,
    email: normalizedEmail,
    first_name: normalizedFirstName,
    last_name: normalizedLastName,
  });

  try {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: new Error(
          'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.',
        ),
      };
    }

    const connection = await probeSupabaseConnection();
    if (!connection.ok) {
      return { data: null, error: connection.error };
    }

    const { data, error } = await getSupabase().rpc('register_user', {
      p_phone: params.phone,
      p_email: normalizedEmail,
      p_first_name: normalizedFirstName,
      p_last_name: normalizedLastName,
      p_password: params.password,
    });

    logSignupDebug('register_user response', { data, error });

    if (error) {
      return { data: null, error: mapDatabaseError(error) };
    }

    const user = parseUserOnly(data);
    if (!user) {
      return { data: null, error: new Error('Unable to create account.') };
    }

    logSignupDebug('success', { userId: user.id });
    return { data: user, error: null };
  } catch (error) {
    logSignupDebug('unexpected error', error);
    return { data: null, error: toError(error) };
  }
}

export async function loginUser(
  phone: string,
  password: string,
): Promise<AuthServiceResult<AuthSessionPayload>> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: new Error(
          'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.',
        ),
      };
    }

    const connection = await probeSupabaseConnection();
    if (!connection.ok) {
      return { data: null, error: connection.error };
    }

    const { data, error } = await getSupabase().rpc('login_user', {
      p_phone: phone,
      p_password: password,
    });

    if (error) {
      return { data: null, error: mapDatabaseError(error) };
    }

    const parsed = parseAuthPayload(data);
    if (!parsed) {
      return { data: null, error: new Error('invalid_credentials') };
    }

    return { data: parsed, error: null };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
}

export async function validateSession(
  sessionToken: string,
): Promise<AuthServiceResult<AuthSessionPayload>> {
  try {
    if (!isSupabaseConfigured() || !sessionToken.trim()) {
      return { data: null, error: new Error('invalid_session') };
    }

    const { data, error } = await getSupabase().rpc('validate_user_session', {
      p_session_token: sessionToken,
    });

    if (error) {
      return { data: null, error: mapDatabaseError(error) };
    }

    const parsed = parseAuthPayload(data);
    if (!parsed) {
      return { data: null, error: new Error('invalid_session') };
    }

    return { data: parsed, error: null };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
}

export async function logoutUser(sessionToken: string | null | undefined): Promise<void> {
  if (!sessionToken || !isSupabaseConfigured()) {
    return;
  }

  try {
    await getSupabase().rpc('logout_user', { p_session_token: sessionToken });
  } catch {
    // Local logout must succeed even if revoke fails offline.
  }
}

export async function updateCustomerProfile(
  sessionToken: string,
  params: { firstName: string; lastName: string; email: string },
): Promise<AuthServiceResult<AppUser>> {
  try {
    if (!isSupabaseConfigured() || !sessionToken.trim()) {
      return { data: null, error: new Error('invalid_session') };
    }

    const { data, error } = await getSupabase().rpc('update_customer_profile', {
      p_session_token: sessionToken,
      p_first_name: params.firstName.trim(),
      p_last_name: params.lastName.trim(),
      p_email: params.email.trim().toLowerCase(),
    });

    if (error) {
      return { data: null, error: mapDatabaseError(error) };
    }

    const user = parseUserOnly(data);
    if (!user) {
      return { data: null, error: new Error('Unable to update profile.') };
    }

    return { data: user, error: null };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
}

export async function changeCustomerPassword(
  sessionToken: string,
  currentPassword: string,
  newPassword: string,
): Promise<AuthServiceResult<true>> {
  try {
    if (!isSupabaseConfigured() || !sessionToken.trim()) {
      return { data: null, error: new Error('invalid_session') };
    }

    const { error } = await getSupabase().rpc('change_customer_password', {
      p_session_token: sessionToken,
      p_current_password: currentPassword,
      p_new_password: newPassword,
    });

    if (error) {
      return { data: null, error: mapDatabaseError(error) };
    }

    return { data: true, error: null };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
}

export async function requestPasswordReset(
  phone: string,
  email: string,
): Promise<AuthServiceResult<{ resetToken: string; expiresAt: string }>> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: new Error(
          'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.',
        ),
      };
    }

    const { data, error } = await getSupabase().rpc('request_password_reset', {
      p_phone: phone,
      p_email: email.trim().toLowerCase(),
    });

    if (error) {
      return { data: null, error: mapDatabaseError(error) };
    }

    const payload = data as { ok?: boolean; reset_token?: string; expires_at?: string } | null;
    if (!payload?.reset_token || typeof payload.reset_token !== 'string') {
      return { data: null, error: new Error('Unable to start password reset.') };
    }

    return {
      data: {
        resetToken: payload.reset_token,
        expiresAt: payload.expires_at ?? new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
}

export async function completePasswordReset(
  resetToken: string,
  newPassword: string,
): Promise<AuthServiceResult<true>> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: new Error(
          'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.',
        ),
      };
    }

    const { error } = await getSupabase().rpc('complete_password_reset', {
      p_reset_token: resetToken,
      p_new_password: newPassword,
    });

    if (error) {
      return { data: null, error: mapDatabaseError(error) };
    }

    return { data: true, error: null };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
}
