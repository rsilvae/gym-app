import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { CODE_LENGTH, CodeInput } from '@/components/code-input';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useCountdown } from '@/hooks/use-countdown';
import { authApi } from '@/lib/auth-api';

const RESEND_SECONDS = 60;

/**
 * "Olvidé mi contraseña", en dos pasos:
 *  1. Escribes tu email y te llega un código.
 *  2. Escribes el código y tu contraseña nueva → quedas con la sesión iniciada.
 */
export default function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { resetPassword } = useAuth();
  const resendTimer = useCountdown(RESEND_SECONDS);

  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  async function sendCode() {
    if (!normalizedEmail.includes('@')) {
      setError('Escribe el email de tu cuenta.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await authApi.forgotPassword(normalizedEmail);
      setStep('reset');
      setNotice(null);
      resendTimer.restart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo salió mal.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      await authApi.forgotPassword(normalizedEmail);
      setNotice('Te enviamos un código nuevo.');
      resendTimer.restart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reenviar el código.');
    }
  }

  async function submitNewPassword() {
    if (code.length !== CODE_LENGTH) return setError('Escribe el código de 6 dígitos.');
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (password !== confirmPassword) return setError('Las contraseñas no coinciden.');

    setIsSubmitting(true);
    setError(null);
    try {
      await resetPassword(normalizedEmail, code, password);
      // Al iniciar sesión, el layout muestra la app solo
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
          <ThemedText type="title" style={styles.center}>
            🔑
          </ThemedText>
          <ThemedText type="subtitle" style={styles.center}>
            {step === 'email' ? '¿Olvidaste tu contraseña?' : 'Crea una contraseña nueva'}
          </ThemedText>

          {step === 'email' ? (
            <>
              <ThemedText themeColor="textSecondary" style={styles.center}>
                Escribe el email de tu cuenta y te enviaremos un código.
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
                  autoFocus
                  onSubmitEditing={() => void sendCode()}
                />
              </ThemedView>
            </>
          ) : (
            <>
              <ThemedText themeColor="textSecondary" style={styles.center}>
                Si existe una cuenta con{'\n'}
                <ThemedText type="smallBold">{normalizedEmail}</ThemedText>
                {'\n'}te llegó un código de 6 dígitos (revisa también spam).
              </ThemedText>
              <CodeInput value={code} onChange={setCode} editable={!isSubmitting} autoFocus />
              <ThemedView type="backgroundElement" style={styles.card}>
                <TextField
                  label="Contraseña nueva"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                />
                <TextField
                  label="Repite la contraseña"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                />
              </ThemedView>
            </>
          )}

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}
          {notice && !error && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              {notice}
            </ThemedText>
          )}

          {step === 'email' ? (
            <Button
              title={isSubmitting ? 'Enviando...' : 'Enviar código'}
              disabled={isSubmitting}
              onPress={() => void sendCode()}
            />
          ) : (
            <>
              <Button
                title={isSubmitting ? 'Guardando...' : 'Cambiar contraseña'}
                disabled={isSubmitting}
                onPress={() => void submitNewPassword()}
              />
              <Pressable
                accessibilityRole="button"
                disabled={resendTimer.isRunning}
                onPress={() => void resend()}
                style={styles.link}>
                <ThemedText type="small" themeColor={resendTimer.isRunning ? 'textSecondary' : 'primary'}>
                  {resendTimer.isRunning ? `Reenviar código en ${resendTimer.seconds} s` : 'Reenviar código'}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setStep('email');
                  setCode('');
                  setError(null);
                }}
                style={styles.link}>
                <ThemedText type="small" themeColor="primary">
                  Usar otro email
                </ThemedText>
              </Pressable>
            </>
          )}

          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.link}>
            <ThemedText type="small" themeColor="primary">
              ‹ Volver al inicio de sesión
            </ThemedText>
          </Pressable>
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
  link: {
    alignSelf: 'center',
    padding: Spacing.two,
  },
});
