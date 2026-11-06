import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { authApi } from '@/lib/auth-api';

const CODE_LENGTH = 6;
/** La API no envía más de un código por minuto. */
const RESEND_SECONDS = 60;

/** Pantalla "Revisa tu correo": se escribe el código de 6 dígitos que llegó por email. */
export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyEmail } = useAuth();
  const theme = useTheme();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);

  // Cuenta regresiva para poder reenviar el código
  useEffect(() => {
    if (resendIn <= 0) return;
    const timeout = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timeout);
  }, [resendIn]);

  async function submit(value: string) {
    if (value.length !== CODE_LENGTH || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await verifyEmail(email, value);
      // Al iniciar sesión, el layout muestra la app solo
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo salió mal.');
      setCode('');
      setIsSubmitting(false);
    }
  }

  function handleChange(text: string) {
    const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    // Al completar los 6 dígitos se envía solo (también funciona con el autocompletado de iOS)
    if (digits.length === CODE_LENGTH) void submit(digits);
  }

  async function resend() {
    setError(null);
    setNotice(null);
    try {
      await authApi.resendCode(email);
      setNotice('Te enviamos un código nuevo.');
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reenviar el código.');
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
            📬
          </ThemedText>
          <ThemedText type="subtitle" style={styles.center}>
            Revisa tu correo
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.center}>
            Te enviamos un código de 6 dígitos a{'\n'}
            <ThemedText type="smallBold">{email}</ThemedText>
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            Si no lo ves, revisa la carpeta de spam.
          </ThemedText>

          <TextInput
            value={code}
            onChangeText={handleChange}
            placeholder="000000"
            placeholderTextColor={theme.backgroundSelected}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={CODE_LENGTH}
            autoFocus
            editable={!isSubmitting}
            accessibilityLabel="Código de verificación"
            style={[styles.codeInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          />

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

          <Button
            title={isSubmitting ? 'Verificando...' : 'Verificar'}
            disabled={isSubmitting || code.length !== CODE_LENGTH}
            onPress={() => void submit(code)}
          />

          <Pressable
            accessibilityRole="button"
            disabled={resendIn > 0}
            onPress={() => void resend()}
            style={styles.link}>
            <ThemedText type="small" themeColor={resendIn > 0 ? 'textSecondary' : 'primary'}>
              {resendIn > 0 ? `Reenviar código en ${resendIn} s` : 'Reenviar código'}
            </ThemedText>
          </Pressable>

          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.link}>
            <ThemedText type="small" themeColor="primary">
              ‹ Volver
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
  codeInput: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 12,
    textAlign: 'center',
    paddingVertical: Spacing.three,
    borderRadius: 16,
    marginTop: Spacing.two,
    fontVariant: ['tabular-nums'],
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
