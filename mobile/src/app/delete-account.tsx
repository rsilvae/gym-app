import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

/**
 * Eliminar la cuenta (Apple lo exige a las apps que permiten crear cuentas).
 * Se pide la contraseña y una confirmación extra, porque no se puede deshacer.
 */
export default function DeleteAccountScreen() {
  const { user, deleteAccount } = useAuth();

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function remove() {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteAccount(password);
      // Al cerrar la sesión, la app vuelve sola al login; el aviso queda encima
      Alert.alert('Cuenta eliminada', 'Tu cuenta y todos tus datos se borraron. Te enviamos un email de confirmación.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo salió mal.');
      setIsDeleting(false);
    }
  }

  function confirm() {
    if (!password) return setError('Escribe tu contraseña para confirmar.');
    Alert.alert('¿Eliminar tu cuenta?', 'Esto no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void remove() },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled">
        <ThemedText type="title" style={styles.center}>
          ⚠️
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Se borrarán para siempre tu cuenta{user?.username ? ` @${user.username}` : ''}, tus rutinas y todo tu
          historial de entrenamientos. No se puede deshacer.
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.card}>
          <TextField
            label="Tu contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={confirm}
          />
        </ThemedView>

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        <Button
          title={isDeleting ? 'Eliminando...' : 'Eliminar mi cuenta'}
          variant="danger"
          disabled={isDeleting}
          onPress={confirm}
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  center: {
    textAlign: 'center',
  },
  card: {
    padding: Spacing.three,
    borderRadius: 16,
  },
  error: {
    color: '#E5484D',
    textAlign: 'center',
  },
});
