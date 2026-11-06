import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

/**
 * Cambiar la contraseña desde el Perfil (sabiendo la actual).
 * Al terminar, este celular sigue con la sesión iniciada y los demás quedan afuera.
 */
export default function ChangePasswordScreen() {
  const { changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  async function submit() {
    if (!currentPassword) return setError('Escribe tu contraseña actual.');
    if (newPassword.length < 8) return setError('La contraseña nueva debe tener al menos 8 caracteres.');
    if (newPassword !== confirmPassword) return setError('Las contraseñas nuevas no coinciden.');
    if (newPassword === currentPassword) return setError('La contraseña nueva debe ser distinta a la actual.');

    setIsSubmitting(true);
    setError(null);
    try {
      await changePassword(currentPassword, newPassword);
      setIsDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo salió mal.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isDone) {
    return (
      <ThemedView style={[styles.container, styles.done]}>
        <ThemedText type="title" style={styles.center}>
          ✅
        </ThemedText>
        <ThemedText type="subtitle" style={styles.center}>
          ¡Contraseña cambiada!
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.center}>
          Tu contraseña se actualizó con éxito. Si tenías la sesión abierta en otros dispositivos, se cerró en
          todos menos en este.
        </ThemedText>
        <Button title="Volver al perfil" onPress={() => router.back()} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled">
        <ThemedView type="backgroundElement" style={styles.card}>
          <TextField
            label="Contraseña actual"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            autoFocus
          />
          <TextField
            label="Contraseña nueva"
            placeholder="Mínimo 8 caracteres"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <TextField
            label="Repite la contraseña nueva"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
          />
        </ThemedView>

        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Por seguridad, se cerrará la sesión en tus otros dispositivos.
        </ThemedText>

        {error && (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        )}

        <Button
          title={isSubmitting ? 'Guardando...' : 'Cambiar contraseña'}
          disabled={isSubmitting}
          onPress={() => void submit()}
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
  done: {
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  center: {
    textAlign: 'center',
  },
  card: {
    padding: Spacing.three,
    borderRadius: 16,
    gap: Spacing.three,
  },
  error: {
    color: '#E5484D',
    textAlign: 'center',
  },
});
