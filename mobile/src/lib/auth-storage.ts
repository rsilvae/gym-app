import * as SecureStore from 'expo-secure-store';

import type { User } from '@/types';

/**
 * Guarda la sesión en el almacenamiento seguro del celular
 * (Keychain en iPhone, Keystore en Android), cifrado por el sistema.
 * Así no tienes que iniciar sesión cada vez que abres la app.
 */
const TOKEN_KEY = 'auth.token';
const USER_KEY = 'auth.user';

export async function saveSession(token: string, user: User) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function loadSession(): Promise<{ token: string; user: User } | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const userJson = await SecureStore.getItemAsync(USER_KEY);
  if (!token || !userJson) return null;

  try {
    return { token, user: JSON.parse(userJson) as User };
  } catch {
    return null;
  }
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
