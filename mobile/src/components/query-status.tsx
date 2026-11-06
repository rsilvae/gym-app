import { ActivityIndicator, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Pantalla de "cargando..." mientras llega la respuesta de la API. */
export function LoadingView() {
  const theme = useTheme();
  return (
    <ThemedView style={styles.center}>
      <ActivityIndicator size="large" color={theme.primary} />
    </ThemedView>
  );
}

type ErrorViewProps = {
  error: Error;
  onRetry?: () => void;
};

/** Pantalla de error con el mensaje y un botón para reintentar. */
export function ErrorView({ error, onRetry }: ErrorViewProps) {
  return (
    <ThemedView style={styles.center}>
      <ThemedText type="smallBold">Algo salió mal</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
        {error.message}
      </ThemedText>
      {onRetry && <Button title="Reintentar" variant="secondary" compact onPress={onRetry} />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  message: {
    textAlign: 'center',
  },
});
