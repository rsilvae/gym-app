import { ApiError, apiFetch } from '@/lib/api-client';
import type { AuthResponse, CodeSentResponse, User } from '@/types';

export type LoginInput = { identifier: string; password: string };
export type RegisterInput = { email: string; username: string; password: string };

function post<T>(path: string, body: unknown) {
  return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

/** Funciones que llaman a los endpoints de /auth de la API. */
export const authApi = {
  register: (input: RegisterInput) => post<CodeSentResponse>('/auth/register', input),

  verifyEmail: (email: string, code: string) => post<AuthResponse>('/auth/verify-email', { email, code }),

  resendCode: (email: string) => post<CodeSentResponse>('/auth/resend-code', { email }),

  forgotPassword: (email: string) => post<CodeSentResponse>('/auth/forgot-password', { email }),

  resetPassword: (email: string, code: string, password: string) =>
    post<AuthResponse>('/auth/reset-password', { email, code, password }),

  login: (input: LoginInput) => post<AuthResponse>('/auth/login', input),

  me: () => apiFetch<User>('/auth/me'),
};

/**
 * Si el login falló porque el email no está verificado, devuelve ese email
 * (la API ya le envió un código). Si fue otro error, devuelve null.
 */
export function unverifiedEmailFrom(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.status !== 403) return null;
  const details = error.details as { reason?: string; email?: string } | undefined;
  return details?.reason === 'EMAIL_NOT_VERIFIED' && details.email ? details.email : null;
}
