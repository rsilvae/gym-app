import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AuthProvider, useAuth } from '@/context/auth-context';

// Mantiene la pantalla de carga (splash) visible hasta saber si hay sesión.
void SplashScreen.preventAutoHideAsync();

/**
 * QueryClient: guarda la caché de TanStack Query (los datos que llegan de la API).
 * Se crea una sola vez, fuera del componente.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // si una petición falla, reintenta una vez antes de mostrar el error
      staleTime: 30_000, // durante 30 s los datos se consideran frescos y no se vuelven a pedir
    },
  },
});

/**
 * Layout raíz: envuelve toda la app.
 * - QueryClientProvider: permite usar los hooks de la API en cualquier pantalla.
 * - AuthProvider: sabe quién inició sesión.
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RootNavigator />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

/**
 * Navegación con rutas protegidas (Stack.Protected):
 * cada grupo solo existe si su `guard` es true. Si cierras sesión,
 * las pantallas de la app desaparecen y Expo Router te lleva al login solo.
 */
function RootNavigator() {
  const { status } = useAuth();
  const isSignedIn = status === 'signedIn';

  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync();
  }, [status]);

  // Mientras se lee la sesión guardada, sigue visible el splash.
  if (status === 'loading') return null;

  return (
    <Stack>
      {/* redirectTo: a dónde ir cuando el guard se vuelve false (al cerrar sesión → login) */}
      <Stack.Protected guard={isSignedIn} redirectTo="/login">
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="routine/[id]" options={{ title: 'Rutina', headerBackTitle: 'Rutinas' }} />
        <Stack.Screen name="routine/new" options={{ title: 'Nueva rutina', headerBackTitle: 'Cancelar' }} />
        <Stack.Screen name="routine/edit/[id]" options={{ title: 'Editar rutina', headerBackTitle: 'Cancelar' }} />
        {/* Sin gesto de "deslizar para volver": así no pierdes el entrenamiento por accidente */}
        <Stack.Screen
          name="workout/[routineId]"
          options={{ title: 'Entrenamiento', gestureEnabled: false, headerBackVisible: false }}
        />
        <Stack.Screen name="workout-detail/[id]" options={{ title: 'Entrenamiento', headerBackTitle: 'Atrás' }} />
        <Stack.Screen name="exercises" options={{ title: 'Progreso', headerBackTitle: 'Historial' }} />
        <Stack.Screen name="progress/[name]" options={{ title: 'Progreso', headerBackTitle: 'Atrás' }} />
        <Stack.Screen name="change-password" options={{ title: 'Cambiar contraseña', headerBackTitle: 'Perfil' }} />
        <Stack.Screen name="delete-account" options={{ title: 'Eliminar cuenta', headerBackTitle: 'Perfil' }} />
        <Stack.Screen
          name="import-workouts"
          options={{ title: 'Importar entrenamientos', headerBackTitle: 'Perfil' }}
        />
      </Stack.Protected>

      {/* Al iniciar sesión → la lista de rutinas */}
      <Stack.Protected guard={!isSignedIn} redirectTo="/">
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
