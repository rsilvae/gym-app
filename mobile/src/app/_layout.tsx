import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

/**
 * Layout raíz: envuelve toda la app.
 * Usa un Stack (pantallas que se apilan una sobre otra):
 *  - "(tabs)" es el grupo con las pestañas de abajo.
 *  - "routine/[id]" es el detalle de una rutina, que se abre encima de las pestañas.
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="routine/[id]" options={{ title: 'Rutina', headerBackTitle: 'Rutinas' }} />
      </Stack>
    </ThemeProvider>
  );
}
