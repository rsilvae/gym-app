import { Link } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

type Props = {
  mode: 'login' | 'register';
};

/** Formulario de inicio de sesión o de registro (comparten casi todo). */
export function AuthForm({ mode }: Props) {
  const { signIn, signUp } = useAuth();
  const isRegister = mode === 'register';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Validaciones rápidas antes de llamar a la API (la API vuelve a validar todo). */
  function validate(): string | null {
    if (!email.trim()) return 'Escribe tu email.';
    if (!password) return 'Escribe tu contraseña.';
    if (isRegister && password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (isRegister && password !== confirmPassword) return 'Las contraseñas no coinciden.';
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    setError(validationError);
    if (validationError) return;

    setIsSubmitting(true);
    try {
      const credentials = { email: email.trim(), password };
      await (isRegister ? signUp(credentials) : signIn(credentials));
      // No navegamos a mano: al cambiar la sesión, el layout muestra la app sola.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo salió mal.');
      setIsSubmitting(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={styles.logo}>
            🏋️
          </ThemedText>
          <ThemedText type="subtitle" style={styles.center}>
            {isRegister ? 'Crea tu cuenta' : 'Bienvenido'}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.center}>
            {isRegister ? 'Guarda tus rutinas y tu progreso.' : 'Inicia sesión para ver tus rutinas.'}
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.card}>
            <TextField
              label="Email"
              placeholder="tu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
            />
            <TextField
              label="Contraseña"
              placeholder={isRegister ? 'Mínimo 8 caracteres' : ''}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              textContentType={isRegister ? 'newPassword' : 'password'}
            />
            {isRegister && (
              <TextField
                label="Repite la contraseña"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
              />
            )}
          </ThemedView>

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <Button
            title={isSubmitting ? 'Un momento...' : isRegister ? 'Crear cuenta' : 'Entrar'}
            disabled={isSubmitting}
            onPress={handleSubmit}
          />

          <Link href={isRegister ? '/login' : '/register'} replace style={styles.switchLink}>
            <ThemedText type="small" themeColor="primary">
              {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Créala aquí'}
            </ThemedText>
          </Link>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  logo: {
    textAlign: 'center',
  },
  center: {
    textAlign: 'center',
  },
  card: {
    padding: Spacing.three,
    borderRadius: 16,
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  error: {
    color: '#E5484D',
    textAlign: 'center',
  },
  switchLink: {
    alignSelf: 'center',
    padding: Spacing.two,
  },
});
