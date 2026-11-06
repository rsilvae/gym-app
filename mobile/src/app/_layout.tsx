import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

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
 * - QueryClientProvider hace que todas las pantallas puedan usar los hooks de la API.
 * - Stack apila pantallas una sobre otra:
 *    "(tabs)"              → el grupo con las pestañas de abajo
 *    "routine/[id]"        → detalle de una rutina
 *    "routine/new"         → crear rutina
 *    "routine/edit/[id]"   → editar rutina
 *    "workout/[routineId]" → entrenamiento en curso
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="routine/[id]" options={{ title: 'Rutina', headerBackTitle: 'Rutinas' }} />
          <Stack.Screen name="routine/new" options={{ title: 'Nueva rutina', headerBackTitle: 'Cancelar' }} />
          <Stack.Screen name="routine/edit/[id]" options={{ title: 'Editar rutina', headerBackTitle: 'Cancelar' }} />
          {/* Sin gesto de "deslizar para volver": así no pierdes el entrenamiento por accidente */}
          <Stack.Screen
            name="workout/[routineId]"
            options={{ title: 'Entrenamiento', gestureEnabled: false, headerBackVisible: false }}
          />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
