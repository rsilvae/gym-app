import Constants from 'expo-constants';

/**
 * ¿A qué dirección le habla la app?
 *
 * 1. Si existe EXPO_PUBLIC_API_URL (en mobile/.env), se usa esa. Sirve para producción (Fase 8).
 * 2. Si no, en desarrollo se usa la IP de tu PC: la misma de donde el celular descarga
 *    la app con Expo (ej: "192.168.1.7:8081"), pero con el puerto 3000 de la API.
 *    Así funciona en tu Wi-Fi sin configurar nada.
 */
function getApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${devHost ?? 'localhost'}:3000`;
}

export const API_URL = getApiUrl();

/** Error de la API, con el código HTTP y el mensaje que mandó el servidor. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Token de la sesión actual. Lo maneja AuthProvider (auth-context.tsx):
 * se guarda aquí en memoria para agregarlo a cada petición.
 */
let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Qué hacer si la API dice 401 (token vencido o inválido): normalmente, cerrar sesión. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

/**
 * fetch con lo que siempre necesitamos: URL base, JSON, token y errores claros.
 * Ejemplo: apiFetch<Routine[]>('/routines')
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const sentToken = authToken;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(sentToken ? { Authorization: `Bearer ${sentToken}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      0,
      `No se pudo conectar con la API (${API_URL}). ¿Está corriendo "npm run dev" en la carpeta api?`,
    );
  }

  // 204 = éxito sin contenido (por ejemplo, al eliminar)
  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);

  // Mandamos un token y la API lo rechazó → la sesión ya no sirve
  if (response.status === 401 && sentToken) {
    onUnauthorized?.();
  }

  if (!response.ok) {
    throw new ApiError(response.status, body?.error ?? `Error ${response.status}`);
  }
  return body as T;
}
