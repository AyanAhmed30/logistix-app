import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { AppSession, AppUser } from '@/types/auth';

const SESSION_KEY = 'logistix_app_session';

async function readSession(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(SESSION_KEY);
  }
  return SecureStore.getItemAsync(SESSION_KEY);
}

async function writeSession(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(SESSION_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, value);
}

async function deleteSession(): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(SESSION_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

function isSessionShape(value: unknown): value is AppSession {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<AppSession>;
  return Boolean(
    s.user &&
      typeof s.user.id === 'string' &&
      typeof s.sessionToken === 'string' &&
      s.sessionToken.length >= 32 &&
      typeof s.expiresAt === 'string' &&
      typeof s.loggedInAt === 'string',
  );
}

export function isSessionExpired(session: Pick<AppSession, 'expiresAt'>): boolean {
  const expires = Date.parse(session.expiresAt);
  if (Number.isNaN(expires)) return true;
  return expires <= Date.now();
}

export async function loadStoredSession(): Promise<AppSession | null> {
  const raw = await readSession();
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isSessionShape(parsed)) {
      // Legacy sessions without server token are no longer valid (Step 2 P0).
      await deleteSession();
      return null;
    }
    if (isSessionExpired(parsed)) {
      await deleteSession();
      return null;
    }
    return parsed;
  } catch {
    await deleteSession();
    return null;
  }
}

export async function saveSession(
  user: AppUser,
  sessionToken: string,
  expiresAt: string,
): Promise<AppSession> {
  const session: AppSession = {
    user,
    sessionToken,
    expiresAt,
    loggedInAt: new Date().toISOString(),
  };
  await writeSession(JSON.stringify(session));
  return session;
}

export async function clearStoredSession(): Promise<void> {
  await deleteSession();
}
