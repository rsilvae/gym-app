import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { RoutinesProvider } from '@/context/routines-context';

/**
 * Layout raíz: envuelve toda la app.
 * - RoutinesProvider comparte la lista de rutinas con todas las pantallas.
 * - Stack apila pantallas una sobre otra:
 *    "(tabs)"              → el grupo con las pestañas de abajo
 *    "routine/[id]"        → detalle de una rutina
 *    "routine/new"         → crear rutina
 *    "routine/edit/[id]"   → editar rutina
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <RoutinesProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="routine/[id]" options={{ title: 'Rutina', headerBackTitle: 'Rutinas' }} />
          <Stack.Screen name="routine/new" options={{ title: 'Nueva rutina', headerBackTitle: 'Cancelar' }} />
          <Stack.Screen name="routine/edit/[id]" options={{ title: 'Editar rutina', headerBackTitle: 'Cancelar' }} />
        </Stack>
      </RoutinesProvider>
    </ThemeProvider>
  );
}
