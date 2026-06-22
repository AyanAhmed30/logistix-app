import { PostgrestError } from '@supabase/supabase-js';

import { getSupabase, isSupabaseConfigured } from '@/services/supabase';
import { AppUser } from '@/types/auth';
import { hashPassword, verifyPassword } from '@/utils/password';

type UserRow = {
  id: string;
  phone: string;
  email: string;
  first_name: string;
  last_name: string;
  password_hash: string;
  created_at: string;
};

type PublicUserRow = Omit<UserRow, 'password_hash'>;

type InsertPayload = {
  phone: string;
  email: string;
  first_name: string;
  last_name: string;
  password_hash: string;
};

export type AuthServiceResult<T> = {
  data: T | null;
  error: Error | null;
};

function toUser(row: PublicUserRow): AppUser {
  return {
    id: row.id,
    phone: row.phone,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    createdAt: row.created_at,
  };
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
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

  logSignupDebug('database error', { code, message: pgError.message, details: pgError.details, hint: pgError.hint });

  if (code === '23505' || message.includes('duplicate') || message.includes('unique')) {
    if (message.includes('users_phone_key') || message.includes('phone')) {
      return new Error('duplicate_phone');
    }
    if (message.includes('users_email_key') || message.includes('email')) {
      return new Error('duplicate_email');
    }
    return new Error('duplicate_account');
  }

  if (code === '42501' || message.includes('permission denied') || message.includes('row-level security')) {
    return new Error(
      'database_access_denied: Run supabase/migrations/008_direct_users_access.sql in Supabase SQL Editor.',
    );
  }

  if (code === 'PGRST116') {
    return new Error('invalid_credentials');
  }

  return new Error(details || pgError.message || 'Database request failed.');
}

async function findExistingUser(phone: string, email: string): Promise<'phone' | 'email' | null> {
  const client = getSupabase();

  const { data: phoneMatch } = await client.from('users').select('id').eq('phone', phone).maybeSingle();
  if (phoneMatch) {
    return 'phone';
  }

  const { data: emailMatch } = await client
    .from('users')
    .select('id')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (emailMatch) {
    return 'email';
  }

  return null;
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

    const existing = await findExistingUser(params.phone, normalizedEmail);
    if (existing === 'phone') {
      return { data: null, error: new Error('duplicate_phone') };
    }
    if (existing === 'email') {
      return { data: null, error: new Error('duplicate_email') };
    }

    logSignupDebug('hashing password', { length: params.password.length });
    const passwordHash = await hashPassword(params.password);
    logSignupDebug('password hashed', { hashPrefix: passwordHash.slice(0, 7) });

    const insertPayload: InsertPayload = {
      phone: params.phone,
      email: normalizedEmail,
      first_name: normalizedFirstName,
      last_name: normalizedLastName,
      password_hash: passwordHash,
    };

    logSignupDebug('insert payload', {
      ...insertPayload,
      password_hash: `${passwordHash.slice(0, 7)}...`,
    });

    const { data, error } = await getSupabase()
      .from('users')
      .insert(insertPayload)
      .select('id, phone, email, first_name, last_name, created_at')
      .single();

    logSignupDebug('insert response', { data, error });

    if (error) {
      return { data: null, error: mapDatabaseError(error) };
    }

    if (!data) {
      return { data: null, error: new Error('Unable to create account.') };
    }

    logSignupDebug('success', { userId: data.id });
    return { data: toUser(data as PublicUserRow), error: null };
  } catch (error) {
    logSignupDebug('unexpected error', error);
    return { data: null, error: toError(error) };
  }
}

export async function loginUser(
  phone: string,
  password: string,
): Promise<AuthServiceResult<AppUser>> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        data: null,
        error: new Error(
          'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.',
        ),
      };
    }

    const { data, error } = await getSupabase()
      .from('users')
      .select('id, phone, email, first_name, last_name, password_hash, created_at')
      .eq('phone', phone)
      .single();

    if (error) {
      return { data: null, error: mapDatabaseError(error) };
    }

    if (!data) {
      return { data: null, error: new Error('invalid_credentials') };
    }

    const row = data as UserRow;
    const isValid = await verifyPassword(password, row.password_hash);

    if (!isValid) {
      return { data: null, error: new Error('invalid_credentials') };
    }

    const { password_hash: _hash, ...publicRow } = row;
    return { data: toUser(publicRow), error: null };
  } catch (error) {
    return { data: null, error: toError(error) };
  }
}
