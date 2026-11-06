import { apiFetch } from '@/lib/api-client';
import type { AuthResponse, User } from '@/types';

type Credentials = { email: string; password: string };

/** Funciones que llaman a los endpoints de /auth de la API. */
export const authApi = {
  register: (credentials: Credentials) =>
    apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(credentials) }),

  login: (credentials: Credentials) =>
    apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),

  me: () => apiFetch<User>('/auth/me'),
};
