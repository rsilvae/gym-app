import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { unverifiedEmailFrom } from '@/lib/auth-api';

/** Mismas reglas que la API: 3 a 20 caracteres, letras minúsculas, números, _ o . */
const USERNAME_REGEX = /^[a-z0-9_.]{3,20}$/;

type Props = {
  mode: 'login' | 'register';
};

/** Formulario de inicio de sesión o de registro (comparten casi todo). */
export function AuthForm({ mode }: Props) {
  const { signIn, signUp } = useAuth();
  const isRegister = mode === 'register';

  // En el login, "email" es el email o el nombre de usuario
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Validaciones rápidas antes de llamar a la API (la API vuelve a validar todo). */
  function validate(): string | null {
    if (!email.trim()) return isRegister ? 'Escribe tu email.' : 'Escribe tu email o usuario.';
    if (isRegister && !USERNAME_REGEX.test(username.trim().toLowerCase())) {
      return 'El usuario debe tener de 3 a 20 caracteres: letras, números, _ o .';
    }
    if (!password) return 'Escribe tu contraseña.';
    if (isRegister && password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (isRegister && password !== confirmPassword) return 'Las contraseñas no coinciden.';
    return null;
  }

  function goToVerify(emailToVerify: string) {
    router.push({ pathname: '/verify-email', params: { email: emailToVerify } });
  }

  async function handleSubmit() {
    const validationError = validate();
    setError(validationError);
    if (validationError) return;

    setIsSubmitting(true);
    try {
      if (isRegister) {
        await signUp({ email: email.trim(), username: username.trim(), password });
        // La cuenta se creó, pero falta confirmar el código que llegó por email
        goToVerify(email.trim().toLowerCase());
        setIsSubmitting(false);
      } else {
        await signIn({ identifier: email.trim(), password });
        // No navegamos a mano: al cambiar la sesión, el layout muestra la app sola.
      }
    } catch (err) {
      setIsSubmitting(false);
      // Contraseña correcta, pero el email no está verificado: la API ya mandó un código
      const unverifiedEmail = unverifiedEmailFrom(err);
      if (unverifiedEmail) {
        goToVerify(unverifiedEmail);
        return;
      }
      setError(err instanceof Error ? err.message : 'Algo salió mal.');
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
              label={isRegister ? 'Email' : 'Email o usuario'}
              placeholder={isRegister ? 'tu@email.com' : 'tu@email.com o tu_usuario'}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete={isRegister ? 'email' : 'username'}
              textContentType={isRegister ? 'emailAddress' : 'username'}
            />
            {isRegister && (
              <TextField
                label="Nombre de usuario"
                placeholder="3 a 20: letras, números, _ o ."
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username-new"
                textContentType="username"
                maxLength={20}
              />
            )}
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

          {!isRegister && (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/forgot-password',
                  // Si escribió su email, se lo dejamos puesto
                  params: email.includes('@') ? { email: email.trim() } : {},
                })
              }
              style={styles.switchLink}>
              <ThemedText type="small" themeColor="primary">
                ¿Olvidaste tu contraseña?
              </ThemedText>
            </Pressable>
          )}

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
