import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { ApiError, setAuthToken, setUnauthorizedHandler } from '@/lib/api-client';
import { authApi, type LoginInput, type RegisterInput } from '@/lib/auth-api';
import { clearSession, loadSession, saveSession } from '@/lib/auth-storage';
import type { AuthResponse, User } from '@/types';

/**
 * Estado de la sesión:
 *  - 'loading'   → al abrir la app, mientras leemos la sesión guardada
 *  - 'signedOut' → no hay sesión: se muestran login/registro
 *  - 'signedIn'  → hay usuario: se muestra la app
 */
type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'signedOut'; user: null }
  | { status: 'signedIn'; user: User };

type AuthContextValue = AuthState & {
  signIn: (input: LoginInput) => Promise<void>;
  /** Crea la cuenta: todavía no inicia sesión, primero hay que verificar el email. */
  signUp: (input: RegisterInput) => Promise<void>;
  /** Confirma el código del email e inicia sesión. */
  verifyEmail: (email: string, code: string) => Promise<void>;
  /** Inicia sesión con un token que ya se obtuvo (por ejemplo, tras cambiar la contraseña). */
  startSession: (response: AuthResponse) => Promise<void>;
  /** Cambia la contraseña: este celular sigue adentro y los demás quedan afuera. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** Cierra la sesión en todos los dispositivos, incluido este. */
  signOutEverywhere: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  async function signOut() {
    setAuthToken(null);
    await clearSession();
    // Borra la caché: el próximo usuario no debe ver datos del anterior
    queryClient.clear();
    setState({ status: 'signedOut', user: null });
  }

  async function startSession({ token, user }: AuthResponse) {
    setAuthToken(token);
    await saveSession(token, user);
    setState({ status: 'signedIn', user });
  }

  async function signIn(input: LoginInput) {
    await startSession(await authApi.login(input));
  }

  async function signUp(input: RegisterInput) {
    await authApi.register(input);
  }

  async function verifyEmail(email: string, code: string) {
    await startSession(await authApi.verifyEmail(email, code));
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    // La API devuelve un token nuevo; lo guardamos en vez del anterior
    await startSession(await authApi.changePassword(currentPassword, newPassword));
  }

  async function signOutEverywhere() {
    await authApi.logoutAll();
    await signOut();
  }

  // Al abrir la app: recupera la sesión guardada (si hay) y la valida con la API.
  useEffect(() => {
    async function restoreSession() {
      const saved = await loadSession();
      if (!saved) {
        setState({ status: 'signedOut', user: null });
        return;
      }

      // Entramos de inmediato con el usuario guardado (la app abre rápido)...
      setAuthToken(saved.token);
      setState({ status: 'signedIn', user: saved.user });

      // ...y en segundo plano confirmamos que el token sigue siendo válido.
      try {
        const user = await authApi.me();
        setState({ status: 'signedIn', user });
      } catch (error) {
        // 401 ya cierra sesión vía setUnauthorizedHandler. Si es otro error
        // (por ejemplo, sin conexión), seguimos con la sesión guardada.
        if (!(error instanceof ApiError)) throw error;
      }
    }

    void restoreSession();
  }, []);

  // Si cualquier petición recibe 401 (token vencido), cerramos sesión.
  useEffect(() => {
    setUnauthorizedHandler(() => void signOut());
    return () => setUnauthorizedHandler(null);
  });

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, verifyEmail, startSession, changePassword, signOutEverywhere, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook para leer la sesión y usar signIn / signUp / signOut desde cualquier pantalla. */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return context;
}
