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

export async function loadStoredSession(): Promise<AppSession | null> {
  const raw = await readSession();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AppSession;
  } catch {
    await deleteSession();
    return null;
  }
}

export async function saveSession(user: AppUser): Promise<AppSession> {
  const session: AppSession = {
    user,
    loggedInAt: new Date().toISOString(),
  };
  await writeSession(JSON.stringify(session));
  return session;
}

export async function clearStoredSession(): Promise<void> {
  await deleteSession();
}
